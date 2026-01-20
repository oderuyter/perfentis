import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEMO_SEED_KEY = 'aio_demo_v1';

interface CleanupResult {
  success: boolean;
  summary: {
    entitiesRemoved: Record<string, number>;
    usersDeleted: number;
    errors: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await req.json();
    const { hardDelete = false, scope = 'all' } = body;

    const result: CleanupResult = {
      success: true,
      summary: {
        entitiesRemoved: {},
        usersDeleted: 0,
        errors: []
      }
    };

    // Get all registered demo entities
    const { data: registry } = await supabaseAdmin
      .from('demo_seed_registry')
      .select('*')
      .eq('demo_seed_key', DEMO_SEED_KEY)
      .order('created_at', { ascending: false });

    if (!registry || registry.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        summary: { 
          entitiesRemoved: {}, 
          usersDeleted: 0, 
          errors: [],
          message: 'No demo data found to clean up'
        } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Group by entity type
    const entitiesByType: Record<string, { id: string; email?: string }[]> = {};
    for (const entry of registry) {
      if (!entitiesByType[entry.entity_type]) {
        entitiesByType[entry.entity_type] = [];
      }
      entitiesByType[entry.entity_type].push({ 
        id: entry.entity_id, 
        email: entry.entity_email 
      });
    }

    // Delete in correct order (respecting FK constraints)
    const deleteOrder = [
      'notification',
      'message',
      'conversation',
      'set_log',
      'exercise_log',
      'workout_session',
      'personal_record',
      'volunteer_application',
      'event_team_member',
      'event_registration',
      'event_workout',
      'event_division',
      'event',
      'client_checkin',
      'checkin_template',
      'coach_appointment',
      'coach_expense',
      'coach_transaction',
      'coach_invoice',
      'plan_assignment',
      'plan_workout',
      'plan_week',
      'training_plan',
      'coach_service',
      'coach_client',
      'coach',
      'membership',
      'membership_level',
      'gym_staff',
      'gym',
      'user'
    ];

    // Map entity types to table names
    const entityTableMap: Record<string, string> = {
      'notification': 'user_notifications',
      'message': 'messages',
      'conversation': 'conversations',
      'set_log': 'set_logs',
      'exercise_log': 'exercise_logs',
      'workout_session': 'workout_sessions',
      'personal_record': 'personal_records',
      'volunteer_application': 'event_volunteer_applications',
      'event_team_member': 'event_team_members',
      'event_registration': 'event_registrations',
      'event_workout': 'event_workouts',
      'event_division': 'event_divisions',
      'event': 'events',
      'client_checkin': 'client_checkins',
      'checkin_template': 'checkin_templates',
      'coach_appointment': 'coach_appointments',
      'coach_expense': 'coach_expenses',
      'coach_transaction': 'coach_transactions',
      'coach_invoice': 'coach_invoices',
      'plan_assignment': 'client_plan_assignments',
      'plan_workout': 'plan_workouts',
      'plan_week': 'plan_weeks',
      'training_plan': 'training_plans',
      'coach_service': 'coach_services',
      'coach_client': 'coach_clients',
      'coach': 'coaches',
      'membership': 'memberships',
      'membership_level': 'membership_levels',
      'gym_staff': 'gym_staff',
      'gym': 'gyms'
    };

    // Scope filter
    const shouldCleanType = (entityType: string): boolean => {
      if (scope === 'all') return true;
      if (scope === 'messaging' && ['notification', 'message', 'conversation'].includes(entityType)) return true;
      if (scope === 'events' && ['volunteer_application', 'event_team_member', 'event_registration', 'event_workout', 'event_division', 'event'].includes(entityType)) return true;
      if (scope === 'coach' && ['client_checkin', 'checkin_template', 'coach_appointment', 'coach_expense', 'coach_transaction', 'coach_invoice', 'plan_assignment', 'plan_workout', 'plan_week', 'training_plan', 'coach_service', 'coach_client', 'coach'].includes(entityType)) return true;
      if (scope === 'gym' && ['membership', 'membership_level', 'gym_staff', 'gym'].includes(entityType)) return true;
      if (scope === 'workouts' && ['set_log', 'exercise_log', 'workout_session', 'personal_record'].includes(entityType)) return true;
      return false;
    };

    for (const entityType of deleteOrder) {
      if (!shouldCleanType(entityType)) continue;
      
      const entities = entitiesByType[entityType];
      if (!entities || entities.length === 0) continue;

      const tableName = entityTableMap[entityType];
      if (!tableName) continue;

      const ids = entities.map(e => e.id);

      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .delete()
          .in('id', ids);

        if (error) {
          result.summary.errors.push(`Error deleting ${entityType}: ${error.message}`);
        } else {
          result.summary.entitiesRemoved[entityType] = ids.length;
          
          // Remove from registry
          await supabaseAdmin
            .from('demo_seed_registry')
            .delete()
            .eq('demo_seed_key', DEMO_SEED_KEY)
            .eq('entity_type', entityType)
            .in('entity_id', ids);
        }
      } catch (error: unknown) {
        result.summary.errors.push(`Exception deleting ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Handle user cleanup
    if (hardDelete && (scope === 'all' || scope === 'users')) {
      const userEntities = entitiesByType['user'];
      if (userEntities && userEntities.length > 0) {
        for (const userEntity of userEntities) {
          try {
            // First clean up user roles
            await supabaseAdmin
              .from('user_roles')
              .delete()
              .eq('user_id', userEntity.id);

            // Clean up profile
            await supabaseAdmin
              .from('profiles')
              .delete()
              .eq('user_id', userEntity.id);

            // Delete auth user
            const { error } = await supabaseAdmin.auth.admin.deleteUser(userEntity.id);
            
            if (error) {
              result.summary.errors.push(`Error deleting user ${userEntity.email}: ${error.message}`);
            } else {
              result.summary.usersDeleted++;
            }
          } catch (error: unknown) {
            result.summary.errors.push(`Exception deleting user ${userEntity.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Remove users from registry
        const userIds = userEntities.map(e => e.id);
        await supabaseAdmin
          .from('demo_seed_registry')
          .delete()
          .eq('demo_seed_key', DEMO_SEED_KEY)
          .eq('entity_type', 'user')
          .in('entity_id', userIds);
      }
    } else if (!hardDelete && entitiesByType['user']) {
      // Soft reset: mark users as inactive_demo
      const userIds = entitiesByType['user'].map(e => e.id);
      await supabaseAdmin
        .from('profiles')
        .update({ status: 'inactive_demo' })
        .in('user_id', userIds);
        
      result.summary.entitiesRemoved['user_soft_reset'] = userIds.length;
    }

    // Log the cleanup action
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: callerUser.id,
      action: 'demo_data_cleaned',
      message: `Demo data cleanup: ${JSON.stringify(result.summary.entitiesRemoved)}`,
      category: 'admin',
      severity: 'info',
      metadata: { ...result.summary, hardDelete, scope }
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});