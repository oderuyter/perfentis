import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders as makeCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const DEMO_SEED_KEY = 'aio_demo_v1';
const DEFAULT_PASSWORD = 'DemoPass123!';

// Demo user definitions
const DEMO_USERS = [
  { email: 'oderuyter+aioadmin@gmail.com', name: 'Demo Admin', role: 'admin' },
  { email: 'oderuyter+aioathlete1@gmail.com', name: 'Demo Athlete 1', role: 'athlete' },
  { email: 'oderuyter+aioathlete2@gmail.com', name: 'Demo Athlete 2', role: 'athlete' },
  { email: 'oderuyter+aiogymmanager@gmail.com', name: 'Demo Gym Manager', role: 'gym_manager' },
  { email: 'oderuyter+aiogymstaff@gmail.com', name: 'Demo Gym Staff', role: 'gym_staff' },
  { email: 'oderuyter+aiogymmember@gmail.com', name: 'Demo Gym Member', role: 'gym_member' },
  { email: 'oderuyter+aiocoach@gmail.com', name: 'Demo Coach', role: 'coach' },
  { email: 'oderuyter+aioclient1@gmail.com', name: 'Demo Client Active', role: 'coach_client' },
  { email: 'oderuyter+aioclient2@gmail.com', name: 'Demo Client Paused', role: 'coach_client_paused' },
  { email: 'oderuyter+aiocoachlead@gmail.com', name: 'Demo Coaching Lead', role: 'coaching_lead' },
  { email: 'oderuyter+aioorganiser@gmail.com', name: 'Demo Event Organiser', role: 'event_organiser' },
  { email: 'oderuyter+aioeventmember1@gmail.com', name: 'Demo Event Member', role: 'event_member' },
  { email: 'oderuyter+aioteamlead@gmail.com', name: 'Demo Team Leader', role: 'team_leader' },
  { email: 'oderuyter+aioteammember@gmail.com', name: 'Demo Team Member', role: 'team_member' },
  { email: 'oderuyter+aiovolunteer@gmail.com', name: 'Demo Volunteer', role: 'volunteer' },
];

interface SeedResult {
  success: boolean;
  summary: {
    usersCreated: number;
    usersUpdated: number;
    gymsCreated: number;
    eventsCreated: number;
    workoutsCreated: number;
    messagesCreated: number;
    errors: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(req);
  }
  const corsHeaders = makeCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user creation
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

    const result: SeedResult = {
      success: true,
      summary: {
        usersCreated: 0,
        usersUpdated: 0,
        gymsCreated: 0,
        eventsCreated: 0,
        workoutsCreated: 0,
        messagesCreated: 0,
        errors: []
      }
    };

    const userIdMap: Record<string, string> = {};

    // Step 1: Create or update demo users
    for (const demoUser of DEMO_USERS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === demoUser.email);

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          result.summary.usersUpdated++;
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: demoUser.email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: { display_name: demoUser.name }
          });

          if (createError) {
            result.summary.errors.push(`Failed to create ${demoUser.email}: ${createError.message}`);
            continue;
          }

          userId = newUser.user.id;
          result.summary.usersCreated++;
        }

        userIdMap[demoUser.role] = userId;
        userIdMap[demoUser.email] = userId;

        // Update profile (note: profiles table doesn't have email column, it's in auth.users)
        await supabaseAdmin.from('profiles').upsert({
          user_id: userId,
          display_name: demoUser.name,
          telephone: '+44 7700 900' + Math.floor(100 + Math.random() * 900),
          address_line1: '123 Demo Street',
          address_city: 'London',
          address_postcode: 'SW1A 1AA',
          address_country: 'United Kingdom',
          work_company: 'Demo Company Ltd',
          work_address_city: 'London',
          is_demo: true
        }, { onConflict: 'user_id' });

        // Register in demo registry
        await supabaseAdmin.from('demo_seed_registry').upsert({
          demo_seed_key: DEMO_SEED_KEY,
          entity_type: 'user',
          entity_id: userId,
          entity_email: demoUser.email,
          metadata: { role: demoUser.role, name: demoUser.name }
        }, { onConflict: 'demo_seed_key,entity_type,entity_id' });

        // Setup notification preferences
        await supabaseAdmin.from('notification_preferences').upsert({
          user_id: userId,
          workout_reminders: true,
          habit_reminders: true,
          coach_messages: true,
          event_updates: true,
          gym_updates: true,
          announcements: true,
          email_enabled: true
        }, { onConflict: 'user_id' });

      } catch (error: unknown) {
        result.summary.errors.push(`Error processing ${demoUser.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Step 2: Assign roles
    const adminId = userIdMap['admin'];
    if (adminId) {
      await supabaseAdmin.from('user_roles').upsert({
        user_id: adminId,
        role: 'admin',
        scope_type: 'global',
        is_active: true
      }, { onConflict: 'user_id,role,scope_type,scope_id' });
    }

    // Step 3: Create Demo Gym
    let demoGymId: string | null = null;
    const { data: existingGym } = await supabaseAdmin
      .from('gyms')
      .select('id')
      .eq('name', 'Demo Gym')
      .eq('is_demo', true)
      .single();

    if (existingGym) {
      demoGymId = existingGym.id;
    } else {
      const gymManagerId = userIdMap['gym_manager'];
      const { data: newGym, error: gymError } = await supabaseAdmin.from('gyms').insert({
        name: 'Demo Gym',
        description: 'A demonstration gym for testing all platform features',
        address: '456 Fitness Lane, London, SW1A 2BB',
        owner_id: gymManagerId,
        is_demo: true
      }).select().single();

      if (newGym) {
        demoGymId = newGym.id;
        result.summary.gymsCreated++;

        await supabaseAdmin.from('demo_seed_registry').insert({
          demo_seed_key: DEMO_SEED_KEY,
          entity_type: 'gym',
          entity_id: demoGymId,
          metadata: { name: 'Demo Gym' }
        });
      }
    }

    // Create membership levels
    if (demoGymId) {
      const levels = ['Basic', 'Pro'];
      for (const level of levels) {
        const { data: existingLevel } = await supabaseAdmin
          .from('membership_levels')
          .select('id')
          .eq('gym_id', demoGymId)
          .eq('name', level)
          .single();

        if (!existingLevel) {
          const { data: newLevel } = await supabaseAdmin.from('membership_levels').insert({
            gym_id: demoGymId,
            name: level,
            description: `${level} membership tier`,
            price: level === 'Basic' ? 29.99 : 59.99,
            billing_period: 'monthly',
            features: level === 'Basic' 
              ? ['Gym access', 'Locker'] 
              : ['Gym access', 'Locker', 'Classes', 'Personal trainer discount'],
            is_active: true
          }).select().single();

          if (newLevel) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'membership_level',
              entity_id: newLevel.id
            });
          }
        }
      }

      // Add gym manager role
      const gymManagerId = userIdMap['gym_manager'];
      if (gymManagerId) {
        await supabaseAdmin.from('user_roles').upsert({
          user_id: gymManagerId,
          role: 'gym_manager',
          scope_type: 'gym',
          scope_id: demoGymId,
          is_active: true
        }, { onConflict: 'user_id,role,scope_type,scope_id' });
      }

      // Add gym staff
      const gymStaffId = userIdMap['gym_staff'];
      if (gymStaffId) {
        await supabaseAdmin.from('gym_staff').upsert({
          gym_id: demoGymId,
          user_id: gymStaffId,
          role: 'trainer',
          is_active: true
        }, { onConflict: 'gym_id,user_id' });

        await supabaseAdmin.from('user_roles').upsert({
          user_id: gymStaffId,
          role: 'gym_staff',
          scope_type: 'gym',
          scope_id: demoGymId,
          is_active: true
        }, { onConflict: 'user_id,role,scope_type,scope_id' });
      }

      // Create membership for gym member
      const gymMemberId = userIdMap['gym_member'];
      if (gymMemberId) {
        const { data: existingMembership } = await supabaseAdmin
          .from('memberships')
          .select('id')
          .eq('gym_id', demoGymId)
          .eq('user_id', gymMemberId)
          .single();

        if (!existingMembership) {
          const { data: newMembership } = await supabaseAdmin.from('memberships').insert({
            gym_id: demoGymId,
            user_id: gymMemberId,
            status: 'active',
            tier: 'Pro',
            is_demo: true
          }).select().single();

          if (newMembership) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'membership',
              entity_id: newMembership.id
            });
          }
        }

        await supabaseAdmin.from('user_roles').upsert({
          user_id: gymMemberId,
          role: 'gym_user',
          scope_type: 'gym',
          scope_id: demoGymId,
          is_active: true
        }, { onConflict: 'user_id,role,scope_type,scope_id' });
      }
    }

    // Step 4: Create Demo Coach
    let demoCoachId: string | null = null;
    const coachUserId = userIdMap['coach'];
    
    if (coachUserId) {
      const { data: existingCoach } = await supabaseAdmin
        .from('coaches')
        .select('id')
        .eq('user_id', coachUserId)
        .single();

      if (existingCoach) {
        demoCoachId = existingCoach.id;
      } else {
        const { data: newCoach } = await supabaseAdmin.from('coaches').insert({
          user_id: coachUserId,
          display_name: 'Demo Coach',
          bio: 'Certified fitness professional with 10+ years experience in strength and conditioning.',
          specialties: ['Strength Training', 'HIIT', 'Nutrition'],
          certifications: ['NASM CPT', 'CrossFit L2'],
          hourly_rate: 75,
          location: 'London, UK',
          delivery_type: 'hybrid',
          is_public: true,
          is_online: true,
          is_demo: true
        }).select().single();

        if (newCoach) {
          demoCoachId = newCoach.id;

          await supabaseAdmin.from('demo_seed_registry').insert({
            demo_seed_key: DEMO_SEED_KEY,
            entity_type: 'coach',
            entity_id: demoCoachId
          });
        }
      }
    }

    // Create coach services
    let remoteServiceId: string | null = null;
    let hybridServiceId: string | null = null;
    
    if (demoCoachId) {
      const services = [
        { name: 'Remote Coaching', delivery_type: 'remote', price: 150, billing_cycle: 'monthly' },
        { name: 'Hybrid Training', delivery_type: 'hybrid', price: 250, billing_cycle: 'monthly' }
      ];

      for (const service of services) {
        const { data: existingService } = await supabaseAdmin
          .from('coach_services')
          .select('id')
          .eq('coach_id', demoCoachId)
          .eq('name', service.name)
          .single();

        if (existingService) {
          if (service.delivery_type === 'remote') remoteServiceId = existingService.id;
          if (service.delivery_type === 'hybrid') hybridServiceId = existingService.id;
        } else {
          const { data: newService } = await supabaseAdmin.from('coach_services').insert({
            coach_id: demoCoachId,
            ...service,
            description: `${service.name} package`,
            is_active: true
          }).select().single();

          if (newService) {
            if (service.delivery_type === 'remote') remoteServiceId = newService.id;
            if (service.delivery_type === 'hybrid') hybridServiceId = newService.id;

            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'coach_service',
              entity_id: newService.id
            });
          }
        }
      }

      // Create training plan
      let trainingPlanId: string | null = null;
      const { data: existingPlan } = await supabaseAdmin
        .from('training_plans')
        .select('id')
        .eq('coach_id', demoCoachId)
        .eq('name', 'Demo Strength Program')
        .single();

      if (existingPlan) {
        trainingPlanId = existingPlan.id;
      } else {
        const { data: newPlan } = await supabaseAdmin.from('training_plans').insert({
          coach_id: demoCoachId,
          name: 'Demo Strength Program',
          description: 'A 2-week introductory strength training program',
          plan_type: 'workout',
          duration_weeks: 2,
          is_template: true,
          is_active: true,
          is_demo: true
        }).select().single();

        if (newPlan) {
          trainingPlanId = newPlan.id;

          await supabaseAdmin.from('demo_seed_registry').insert({
            demo_seed_key: DEMO_SEED_KEY,
            entity_type: 'training_plan',
            entity_id: trainingPlanId
          });

          // Create plan weeks and workouts
          for (let weekNum = 1; weekNum <= 2; weekNum++) {
            const { data: week } = await supabaseAdmin.from('plan_weeks').insert({
              plan_id: trainingPlanId,
              week_number: weekNum,
              name: `Week ${weekNum}`,
              notes: `Focus on ${weekNum === 1 ? 'technique' : 'progressive overload'}`
            }).select().single();

            if (week) {
              await supabaseAdmin.from('demo_seed_registry').insert({
                demo_seed_key: DEMO_SEED_KEY,
                entity_type: 'plan_week',
                entity_id: week.id
              });

              // Create 3 workouts per week
              const workouts = [
                { name: 'Upper Body A', day_of_week: 1 },
                { name: 'Lower Body', day_of_week: 3 },
                { name: 'Upper Body B', day_of_week: 5 }
              ];

              for (let i = 0; i < workouts.length; i++) {
                const { data: workout } = await supabaseAdmin.from('plan_workouts').insert({
                  week_id: week.id,
                  day_of_week: workouts[i].day_of_week,
                  name: workouts[i].name,
                  description: `${workouts[i].name} session`,
                  coach_notes: 'Focus on controlled movements',
                  order_index: i,
                  exercise_data: JSON.stringify([
                    { name: 'Bench Press', sets: 4, reps: '8-10', rest: 90 },
                    { name: 'Rows', sets: 4, reps: '8-10', rest: 90 },
                    { name: 'Shoulder Press', sets: 3, reps: '10-12', rest: 60 }
                  ])
                }).select().single();

                if (workout) {
                  await supabaseAdmin.from('demo_seed_registry').insert({
                    demo_seed_key: DEMO_SEED_KEY,
                    entity_type: 'plan_workout',
                    entity_id: workout.id
                  });
                }
              }
            }
          }
        }
      }

      // Create coach clients
      const client1Id = userIdMap['coach_client'];
      const client2Id = userIdMap['coach_client_paused'];

      for (const clientData of [
        { userId: client1Id, status: 'active' },
        { userId: client2Id, status: 'paused' }
      ]) {
        if (clientData.userId) {
          const { data: existingClient } = await supabaseAdmin
            .from('coach_clients')
            .select('id')
            .eq('coach_id', demoCoachId)
            .eq('client_user_id', clientData.userId)
            .single();

          if (!existingClient) {
            const { data: newClient } = await supabaseAdmin.from('coach_clients').insert({
              coach_id: demoCoachId,
              client_user_id: clientData.userId,
              service_id: remoteServiceId,
              status: clientData.status,
              notes: `Demo ${clientData.status} client`
            }).select().single();

            if (newClient) {
              await supabaseAdmin.from('demo_seed_registry').insert({
                demo_seed_key: DEMO_SEED_KEY,
                entity_type: 'coach_client',
                entity_id: newClient.id
              });

              // Assign training plan to active client
              if (clientData.status === 'active' && trainingPlanId) {
                const { data: assignment } = await supabaseAdmin.from('client_plan_assignments').insert({
                  client_id: newClient.id,
                  plan_id: trainingPlanId,
                  start_date: new Date().toISOString().split('T')[0],
                  status: 'active',
                  current_week: 1
                }).select().single();

                if (assignment) {
                  await supabaseAdmin.from('demo_seed_registry').insert({
                    demo_seed_key: DEMO_SEED_KEY,
                    entity_type: 'plan_assignment',
                    entity_id: assignment.id
                  });
                }
              }
            }
          }

          await supabaseAdmin.from('user_roles').upsert({
            user_id: clientData.userId,
            role: 'coach_client',
            scope_type: 'global',
            is_active: true
          }, { onConflict: 'user_id,role,scope_type,scope_id' });
        }
      }

      // Create coach appointments
      const { data: activeClient } = await supabaseAdmin
        .from('coach_clients')
        .select('id')
        .eq('coach_id', demoCoachId)
        .eq('status', 'active')
        .single();

      if (activeClient) {
        const appointments = [
          { title: 'Progress Check-in', days_offset: 2 },
          { title: 'Program Review', days_offset: 7 }
        ];

        for (const apt of appointments) {
          const aptDate = new Date();
          aptDate.setDate(aptDate.getDate() + apt.days_offset);
          aptDate.setHours(10, 0, 0, 0);

          const { data: existingApt } = await supabaseAdmin
            .from('coach_appointments')
            .select('id')
            .eq('coach_id', demoCoachId)
            .eq('title', apt.title)
            .single();

          if (!existingApt) {
            const { data: newApt } = await supabaseAdmin.from('coach_appointments').insert({
              coach_id: demoCoachId,
              client_id: activeClient.id,
              title: apt.title,
              start_time: aptDate.toISOString(),
              duration_minutes: 30,
              mode: 'video',
              status: 'scheduled'
            }).select().single();

            if (newApt) {
              await supabaseAdmin.from('demo_seed_registry').insert({
                demo_seed_key: DEMO_SEED_KEY,
                entity_type: 'coach_appointment',
                entity_id: newApt.id
              });
            }
          }
        }

        // Create invoice
        const { data: existingInvoice } = await supabaseAdmin
          .from('coach_invoices')
          .select('id')
          .eq('coach_id', demoCoachId)
          .eq('invoice_number', 'DEMO-001')
          .single();

        if (!existingInvoice) {
          const { data: invoice } = await supabaseAdmin.from('coach_invoices').insert({
            coach_id: demoCoachId,
            client_id: activeClient.id,
            service_id: remoteServiceId,
            invoice_number: 'DEMO-001',
            amount: 150,
            currency: 'GBP',
            status: 'paid',
            description: 'Remote Coaching - January',
            due_date: new Date().toISOString(),
            paid_at: new Date().toISOString()
          }).select().single();

          if (invoice) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'coach_invoice',
              entity_id: invoice.id
            });

            // Create transaction
            const { data: transaction } = await supabaseAdmin.from('coach_transactions').insert({
              coach_id: demoCoachId,
              invoice_id: invoice.id,
              amount: 150,
              currency: 'GBP',
              transaction_type: 'payment',
              description: 'Payment for DEMO-001'
            }).select().single();

            if (transaction) {
              await supabaseAdmin.from('demo_seed_registry').insert({
                demo_seed_key: DEMO_SEED_KEY,
                entity_type: 'coach_transaction',
                entity_id: transaction.id
              });
            }
          }
        }

        // Create expense
        const { data: existingExpense } = await supabaseAdmin
          .from('coach_expenses')
          .select('id')
          .eq('coach_id', demoCoachId)
          .eq('description', 'Demo Equipment Purchase')
          .single();

        if (!existingExpense) {
          const { data: expense } = await supabaseAdmin.from('coach_expenses').insert({
            coach_id: demoCoachId,
            amount: 50,
            currency: 'GBP',
            category: 'equipment',
            description: 'Demo Equipment Purchase',
            expense_date: new Date().toISOString()
          }).select().single();

          if (expense) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'coach_expense',
              entity_id: expense.id
            });
          }
        }
      }

      // Create check-in template
      const { data: existingTemplate } = await supabaseAdmin
        .from('checkin_templates')
        .select('id')
        .eq('coach_id', demoCoachId)
        .eq('name', 'Weekly Check-in')
        .single();

      if (!existingTemplate) {
        const { data: template } = await supabaseAdmin.from('checkin_templates').insert({
          coach_id: demoCoachId,
          name: 'Weekly Check-in',
          description: 'Weekly progress check-in form',
          frequency: 'weekly',
          questions: JSON.stringify([
            { type: 'scale', question: 'How was your energy this week?', min: 1, max: 10 },
            { type: 'text', question: 'Any challenges faced?' },
            { type: 'scale', question: 'Sleep quality?', min: 1, max: 10 }
          ]),
          is_active: true
        }).select().single();

        if (template) {
          await supabaseAdmin.from('demo_seed_registry').insert({
            demo_seed_key: DEMO_SEED_KEY,
            entity_type: 'checkin_template',
            entity_id: template.id
          });
        }
      }
    }

    // Step 5: Create Demo Event
    let demoEventId: string | null = null;
    const organiserId = userIdMap['event_organiser'];

    if (organiserId) {
      await supabaseAdmin.from('user_roles').upsert({
        user_id: organiserId,
        role: 'event_organiser',
        scope_type: 'global',
        is_active: true
      }, { onConflict: 'user_id,role,scope_type,scope_id' });

      const { data: existingEvent } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('title', 'Demo Fitness Competition')
        .eq('is_demo', true)
        .single();

      if (existingEvent) {
        demoEventId = existingEvent.id;
      } else {
        const eventDate = new Date();
        eventDate.setMonth(eventDate.getMonth() + 1);

        const { data: newEvent } = await supabaseAdmin.from('events').insert({
          organiser_id: organiserId,
          title: 'Demo Fitness Competition',
          description: 'A demonstration fitness competition showcasing all event features',
          event_date: eventDate.toISOString().split('T')[0],
          location: 'Demo Arena, London',
          status: 'published',
          enable_checkin: true,
          enable_volunteers: true,
          enable_waitlist: true,
          capacity: 100,
          registration_open: true,
          is_demo: true
        }).select().single();

        if (newEvent) {
          demoEventId = newEvent.id;
          result.summary.eventsCreated++;

          await supabaseAdmin.from('demo_seed_registry').insert({
            demo_seed_key: DEMO_SEED_KEY,
            entity_type: 'event',
            entity_id: demoEventId
          });
        }
      }
    }

    // Create event divisions
    let rxDivisionId: string | null = null;
    let pairsDivisionId: string | null = null;

    if (demoEventId) {
      const divisions = [
        { name: 'Individual RX', category: 'rx', team_size: 1 },
        { name: 'Mixed Pairs', category: 'pairs', team_size: 2 }
      ];

      for (const div of divisions) {
        const { data: existingDiv } = await supabaseAdmin
          .from('event_divisions')
          .select('id')
          .eq('event_id', demoEventId)
          .eq('name', div.name)
          .single();

        if (existingDiv) {
          if (div.team_size === 1) rxDivisionId = existingDiv.id;
          if (div.team_size === 2) pairsDivisionId = existingDiv.id;
        } else {
          const { data: newDiv } = await supabaseAdmin.from('event_divisions').insert({
            event_id: demoEventId,
            name: div.name,
            category: div.category,
            team_size: div.team_size,
            capacity: 50,
            is_active: true
          }).select().single();

          if (newDiv) {
            if (div.team_size === 1) rxDivisionId = newDiv.id;
            if (div.team_size === 2) pairsDivisionId = newDiv.id;

            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'event_division',
              entity_id: newDiv.id
            });
          }
        }
      }

      // Create event workouts
      const workouts = [
        { name: 'Workout 1 - Chipper', description: '50 Box Jumps, 40 KB Swings, 30 Pull-ups, 20 Burpees' },
        { name: 'Workout 2 - AMRAP', description: '12 min AMRAP: 5 Deadlifts, 10 Push-ups, 15 Air Squats' }
      ];

      for (const wod of workouts) {
        const { data: existingWod } = await supabaseAdmin
          .from('event_workouts')
          .select('id')
          .eq('event_id', demoEventId)
          .eq('name', wod.name)
          .single();

        if (!existingWod) {
          const { data: newWod } = await supabaseAdmin.from('event_workouts').insert({
            event_id: demoEventId,
            name: wod.name,
            description: wod.description,
            scoring_type: 'time',
            is_active: true
          }).select().single();

          if (newWod) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'event_workout',
              entity_id: newWod.id
            });
          }
        }
      }

      // Create registrations
      const eventMemberId = userIdMap['event_member'];
      if (eventMemberId && rxDivisionId) {
        const { data: existingReg } = await supabaseAdmin
          .from('event_registrations')
          .select('id')
          .eq('event_id', demoEventId)
          .eq('user_id', eventMemberId)
          .single();

        if (!existingReg) {
          const { data: reg } = await supabaseAdmin.from('event_registrations').insert({
            event_id: demoEventId,
            user_id: eventMemberId,
            division_id: rxDivisionId,
            status: 'confirmed',
            registration_type: 'individual'
          }).select().single();

          if (reg) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'event_registration',
              entity_id: reg.id
            });
          }
        }
      }

      // Create team registration
      const teamLeaderId = userIdMap['team_leader'];
      const teamMemberId = userIdMap['team_member'];

      if (teamLeaderId && pairsDivisionId) {
        const { data: existingTeamReg } = await supabaseAdmin
          .from('event_registrations')
          .select('id')
          .eq('event_id', demoEventId)
          .eq('user_id', teamLeaderId)
          .single();

        if (!existingTeamReg) {
          const { data: teamReg } = await supabaseAdmin.from('event_registrations').insert({
            event_id: demoEventId,
            user_id: teamLeaderId,
            division_id: pairsDivisionId,
            status: 'confirmed',
            registration_type: 'team',
            team_name: 'Demo Team'
          }).select().single();

          if (teamReg) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'event_registration',
              entity_id: teamReg.id
            });

            // Add team member
            if (teamMemberId) {
              const { data: teamMember } = await supabaseAdmin.from('event_team_members').insert({
                registration_id: teamReg.id,
                user_id: teamMemberId,
                status: 'confirmed'
              }).select().single();

              if (teamMember) {
                await supabaseAdmin.from('demo_seed_registry').insert({
                  demo_seed_key: DEMO_SEED_KEY,
                  entity_type: 'event_team_member',
                  entity_id: teamMember.id
                });
              }
            }
          }
        }
      }

      // Create volunteer application
      const volunteerId = userIdMap['volunteer'];
      if (volunteerId) {
        const { data: existingVolunteer } = await supabaseAdmin
          .from('event_volunteer_applications')
          .select('id')
          .eq('event_id', demoEventId)
          .eq('user_id', volunteerId)
          .single();

        if (!existingVolunteer) {
          const { data: volunteerApp } = await supabaseAdmin.from('event_volunteer_applications').insert({
            event_id: demoEventId,
            user_id: volunteerId,
            status: 'pending',
            message: 'I would love to help with the demo event!'
          }).select().single();

          if (volunteerApp) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'volunteer_application',
              entity_id: volunteerApp.id
            });
          }
        }
      }
    }

    // Step 6: Create Workout Sessions for athletes
    const athletes = [userIdMap['athlete'], userIdMap['oderuyter+aioathlete1@gmail.com']];
    
    for (const athleteId of athletes) {
      if (!athleteId) continue;

      // Create 3 completed workout sessions
      for (let i = 0; i < 3; i++) {
        const sessionDate = new Date();
        sessionDate.setDate(sessionDate.getDate() - (i * 2 + 1));

        const { data: existingSession } = await supabaseAdmin
          .from('workout_sessions')
          .select('id')
          .eq('user_id', athleteId)
          .eq('is_demo', true)
          .limit(3);

        if (!existingSession || existingSession.length < 3) {
          const { data: session } = await supabaseAdmin.from('workout_sessions').insert({
            user_id: athleteId,
            workout_name: `Demo Workout ${i + 1}`,
            started_at: sessionDate.toISOString(),
            ended_at: new Date(sessionDate.getTime() + 60 * 60 * 1000).toISOString(),
            duration_seconds: 3600,
            total_volume: 5000 + Math.random() * 2000,
            status: 'completed',
            is_demo: true
          }).select().single();

          if (session) {
            result.summary.workoutsCreated++;

            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'workout_session',
              entity_id: session.id
            });

            // Create exercise logs
            const exercises = ['Bench Press', 'Squat', 'Deadlift'];
            for (let e = 0; e < exercises.length; e++) {
              const { data: exerciseLog } = await supabaseAdmin.from('exercise_logs').insert({
                session_id: session.id,
                exercise_id: `demo-${exercises[e].toLowerCase().replace(' ', '-')}`,
                exercise_name: exercises[e],
                exercise_order: e
              }).select().single();

              if (exerciseLog) {
                await supabaseAdmin.from('demo_seed_registry').insert({
                  demo_seed_key: DEMO_SEED_KEY,
                  entity_type: 'exercise_log',
                  entity_id: exerciseLog.id
                });

                // Create set logs
                for (let s = 1; s <= 4; s++) {
                  const weight = 60 + Math.random() * 40;
                  const { data: setLog } = await supabaseAdmin.from('set_logs').insert({
                    exercise_log_id: exerciseLog.id,
                    set_number: s,
                    target_weight: weight,
                    target_reps: 8,
                    completed_weight: weight,
                    completed_reps: 8 + Math.floor(Math.random() * 3),
                    rpe: 7 + Math.random() * 2,
                    tempo: s === 1 ? '3-1-1-0' : null,
                    is_completed: true
                  }).select().single();

                  if (setLog) {
                    await supabaseAdmin.from('demo_seed_registry').insert({
                      demo_seed_key: DEMO_SEED_KEY,
                      entity_type: 'set_log',
                      entity_id: setLog.id
                    });
                  }
                }
              }
            }
          }
        }
      }

      // Create a personal record
      const { data: existingPR } = await supabaseAdmin
        .from('personal_records')
        .select('id')
        .eq('user_id', athleteId)
        .eq('exercise_name', 'Bench Press')
        .single();

      if (!existingPR) {
        const { data: pr } = await supabaseAdmin.from('personal_records').insert({
          user_id: athleteId,
          exercise_id: 'demo-bench-press',
          exercise_name: 'Bench Press',
          record_type: '1rm',
          value: 100 + Math.random() * 20,
          weight: 100 + Math.random() * 20,
          reps: 1
        }).select().single();

        if (pr) {
          await supabaseAdmin.from('demo_seed_registry').insert({
            demo_seed_key: DEMO_SEED_KEY,
            entity_type: 'personal_record',
            entity_id: pr.id
          });
        }
      }
    }

    // Step 7: Create sample conversations
    const conversationContexts = [
      { type: 'gym', id: demoGymId, subject: 'Gym Enquiry', userId: userIdMap['oderuyter+aioathlete1@gmail.com'] },
      { type: 'coach', id: demoCoachId, subject: 'Coaching Enquiry', userId: userIdMap['coaching_lead'] },
      { type: 'event', id: demoEventId, subject: 'Event Question', userId: userIdMap['event_member'] },
      { type: 'support', id: null, subject: 'Platform Support', userId: userIdMap['oderuyter+aioathlete2@gmail.com'] }
    ];

    for (const ctx of conversationContexts) {
      if (!ctx.userId || (ctx.type !== 'support' && !ctx.id)) continue;

      const { data: existingConvo } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('subject', ctx.subject)
        .eq('is_demo', true)
        .single();

      if (!existingConvo) {
        const { data: convo } = await supabaseAdmin.from('conversations').insert({
          context_type: ctx.type,
          context_id: ctx.id,
          subject: ctx.subject,
          status: 'open',
          is_demo: true
        }).select().single();

        if (convo) {
          result.summary.messagesCreated++;

          await supabaseAdmin.from('demo_seed_registry').insert({
            demo_seed_key: DEMO_SEED_KEY,
            entity_type: 'conversation',
            entity_id: convo.id
          });

          // Add participant
          await supabaseAdmin.from('conversation_participants').insert({
            conversation_id: convo.id,
            user_id: ctx.userId,
            role: 'user'
          });

          // Add message
          const { data: msg } = await supabaseAdmin.from('messages').insert({
            conversation_id: convo.id,
            sender_user_id: ctx.userId,
            body_text: `Hello, I have a question about the ${ctx.subject.toLowerCase()}.`,
            is_system_message: false
          }).select().single();

          if (msg) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'message',
              entity_id: msg.id
            });
          }
        }
      }
    }

    // Step 8: Create notifications
    for (const userId of Object.values(userIdMap)) {
      if (!userId) continue;

      const { data: existingNotif } = await supabaseAdmin
        .from('user_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('title', 'Welcome to Demo Mode')
        .single();

      if (!existingNotif) {
        const { data: notif } = await supabaseAdmin.from('user_notifications').insert({
          user_id: userId,
          title: 'Welcome to Demo Mode',
          body: 'Your demo account is set up and ready to explore!',
          type: 'system',
          is_read: false
        }).select().single();

        if (notif) {
          await supabaseAdmin.from('demo_seed_registry').insert({
            demo_seed_key: DEMO_SEED_KEY,
            entity_type: 'notification',
            entity_id: notif.id
          });
        }
      }
    }

    // Step 9: Create Demo Run Clubs
    const runClubOrganiserId = userIdMap['event_organiser'] || userIdMap['coach'];
    const runClubMemberId1 = userIdMap['oderuyter+aioathlete1@gmail.com'];
    const runClubMemberId2 = userIdMap['oderuyter+aioathlete2@gmail.com'];

    const runClubs = [
      {
        name: 'City Runners',
        description: 'A friendly running club for all abilities. We meet weekly for social runs and host monthly events.',
        primary_city: 'London',
        primary_postcode: 'EC1A',
        primary_country: 'United Kingdom',
        club_style: 'social',
        distances_offered: ['5K', '10K', 'Half Marathon'],
        days_of_week: [2, 6],
        pace_groups: ['Beginner (6:30+/km)', 'Intermediate (5:00-6:00/km)', 'Advanced (<5:00/km)'],
        membership_type: 'free',
        status: 'published'
      },
      {
        name: 'Elite Track Club',
        description: 'Competitive running club focused on performance and racing. Structured training programs with qualified coaches.',
        primary_city: 'Manchester',
        primary_postcode: 'M1',
        primary_country: 'United Kingdom',
        club_style: 'competitive',
        distances_offered: ['800m', '1500m', '5K', '10K'],
        days_of_week: [1, 3, 5],
        pace_groups: ['Performance (<4:30/km)'],
        membership_type: 'paid',
        membership_fee: 25,
        membership_fee_cadence: 'monthly',
        status: 'published'
      },
      {
        name: 'Trail Blazers',
        description: 'Adventure running club exploring trails, parks, and countryside. Mixed abilities welcome.',
        primary_city: 'Bristol',
        primary_postcode: 'BS1',
        primary_country: 'United Kingdom',
        club_style: 'mixed',
        distances_offered: ['10K', 'Half Marathon', 'Marathon', 'Ultra'],
        days_of_week: [0, 3],
        pace_groups: ['Trail Pace (varies)'],
        membership_type: 'paid',
        membership_fee: 5,
        membership_fee_cadence: 'monthly',
        status: 'published'
      }
    ];

    let firstRunClubId: string | null = null;

    for (const clubData of runClubs) {
      if (!runClubOrganiserId) continue;

      const { data: existingClub } = await supabaseAdmin
        .from('run_clubs')
        .select('id')
        .eq('name', clubData.name)
        .single();

      if (existingClub) {
        if (!firstRunClubId) firstRunClubId = existingClub.id;
        continue;
      }

      const { data: newClub, error: clubError } = await supabaseAdmin.from('run_clubs').insert({
        ...clubData,
        owner_user_id: runClubOrganiserId,
        applications_enabled: true,
        auto_approve_applications: false
      }).select().single();

      if (newClub) {
        if (!firstRunClubId) firstRunClubId = newClub.id;

        await supabaseAdmin.from('demo_seed_registry').insert({
          demo_seed_key: DEMO_SEED_KEY,
          entity_type: 'run_club',
          entity_id: newClub.id,
          metadata: { name: clubData.name }
        });

        // Add run club organiser role
        await supabaseAdmin.from('user_roles').upsert({
          user_id: runClubOrganiserId,
          role: 'run_club_organiser',
          scope_type: 'global',
          scope_id: newClub.id,
          is_active: true
        }, { onConflict: 'user_id,role,scope_type,scope_id' });

        // Create runs for the club
        const runs = [
          {
            title: 'Weekly Group Run',
            description: 'Our main weekly group run. All paces welcome!',
            is_recurring: true,
            day_of_week: clubData.days_of_week[0],
            start_time: '18:30:00',
            meeting_point: 'Main entrance, City Park',
            distances: clubData.distances_offered.slice(0, 2),
            difficulty: 'all-levels',
            attendance_tracking_enabled: true,
            is_active: true
          },
          {
            title: 'Weekend Long Run',
            description: 'Longer runs for endurance building.',
            is_recurring: true,
            day_of_week: clubData.days_of_week[1] || 6,
            start_time: '08:00:00',
            meeting_point: 'Coffee shop on High Street',
            distances: clubData.distances_offered,
            difficulty: 'intermediate',
            attendance_tracking_enabled: true,
            is_active: true
          }
        ];

        for (const runData of runs) {
          const { data: run } = await supabaseAdmin.from('run_club_runs').insert({
            ...runData,
            run_club_id: newClub.id,
            pace_groups: clubData.pace_groups
          }).select().single();

          if (run) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'run_club_run',
              entity_id: run.id
            });
          }
        }

        // Create events for the club
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 30);

        const { data: clubEvent } = await supabaseAdmin.from('run_club_events').insert({
          run_club_id: newClub.id,
          title: `${clubData.name} Summer 5K`,
          description: 'Annual club 5K race - members and guests welcome!',
          event_type: 'race',
          event_date: eventDate.toISOString().split('T')[0],
          start_time: '09:00:00',
          location: 'City Park',
          distances: ['5K'],
          capacity: 100,
          registration_required: true,
          status: 'upcoming'
        }).select().single();

        if (clubEvent) {
          await supabaseAdmin.from('demo_seed_registry').insert({
            demo_seed_key: DEMO_SEED_KEY,
            entity_type: 'run_club_event',
            entity_id: clubEvent.id
          });
        }
      }
    }

    // Add members to the first run club
    if (firstRunClubId) {
      const memberIds = [runClubMemberId1, runClubMemberId2].filter(Boolean);
      
      for (const memberId of memberIds) {
        if (!memberId) continue;

        const { data: existingMember } = await supabaseAdmin
          .from('run_club_members')
          .select('id')
          .eq('run_club_id', firstRunClubId)
          .eq('user_id', memberId)
          .single();

        if (!existingMember) {
          const { data: member } = await supabaseAdmin.from('run_club_members').insert({
            run_club_id: firstRunClubId,
            user_id: memberId,
            status: 'active'
          }).select().single();

          if (member) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'run_club_member',
              entity_id: member.id
            });

            // Add run club member role
            await supabaseAdmin.from('user_roles').upsert({
              user_id: memberId,
              role: 'run_club_member',
              scope_type: 'global',
              scope_id: firstRunClubId,
              is_active: true
            }, { onConflict: 'user_id,role,scope_type,scope_id' });
          }
        }
      }

      // Create a pending application
      const leadId = userIdMap['coaching_lead'];
      if (leadId) {
        const { data: existingApp } = await supabaseAdmin
          .from('run_club_applications')
          .select('id')
          .eq('run_club_id', firstRunClubId)
          .eq('user_id', leadId)
          .single();

        if (!existingApp) {
          const { data: app } = await supabaseAdmin.from('run_club_applications').insert({
            run_club_id: firstRunClubId,
            user_id: leadId,
            status: 'pending',
            message: 'I would love to join your running club!'
          }).select().single();

          if (app) {
            await supabaseAdmin.from('demo_seed_registry').insert({
              demo_seed_key: DEMO_SEED_KEY,
              entity_type: 'run_club_application',
              entity_id: app.id
            });
          }
        }
      }

      // Create an announcement
      const { data: existingAnnouncement } = await supabaseAdmin
        .from('run_club_announcements')
        .select('id')
        .eq('run_club_id', firstRunClubId)
        .eq('title', 'Welcome to City Runners!')
        .single();

      if (!existingAnnouncement && runClubOrganiserId) {
        const { data: announcement } = await supabaseAdmin.from('run_club_announcements').insert({
          run_club_id: firstRunClubId,
          author_user_id: runClubOrganiserId,
          title: 'Welcome to City Runners!',
          body: 'We are excited to have you as part of our running community. Check out our weekly runs and upcoming events!',
          is_published: true
        }).select().single();

        if (announcement) {
          await supabaseAdmin.from('demo_seed_registry').insert({
            demo_seed_key: DEMO_SEED_KEY,
            entity_type: 'run_club_announcement',
            entity_id: announcement.id
          });
        }
      }
    }

    // Log the seed action
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: callerUser.id,
      action: 'demo_data_seeded',
      message: `Demo data seeded: ${result.summary.usersCreated} users created, ${result.summary.usersUpdated} updated, run clubs created`,
      category: 'admin',
      severity: 'info',
      metadata: result.summary
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Seed error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});