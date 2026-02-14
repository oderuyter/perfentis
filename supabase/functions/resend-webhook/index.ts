import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeaders as makeCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

// Resend webhook event types
type ResendEventType = 
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked";

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    to: string[];
    from: string;
    subject: string;
    created_at?: string;
    bounce?: {
      message: string;
    };
    complaint?: {
      feedback_type: string;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req, "svix-id, svix-timestamp, svix-signature");
  }
  const corsHeaders = makeCorsHeaders(req, "svix-id, svix-timestamp, svix-signature");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const payload: ResendWebhookPayload = await req.json();
    
    console.log("Received Resend webhook:", payload.type, payload.data.email_id);

    // Find the email log by resend_message_id
    const { data: emailLog, error: findError } = await supabase
      .from("email_logs")
      .select("id")
      .eq("resend_message_id", payload.data.email_id)
      .single();

    if (findError || !emailLog) {
      console.log("Email log not found for message ID:", payload.data.email_id);
      // Still return 200 to acknowledge receipt
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Map Resend event type to our event type
    const eventTypeMap: Record<ResendEventType, string> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.delivery_delayed": "delayed",
      "email.complained": "complained",
      "email.bounced": "bounced",
      "email.opened": "opened",
      "email.clicked": "clicked",
    };

    const eventType = eventTypeMap[payload.type] || payload.type;

    // Insert delivery event
    const { error: insertError } = await supabase
      .from("email_delivery_events")
      .insert({
        email_log_id: emailLog.id,
        event_type: eventType,
        payload_json: payload,
        occurred_at: payload.created_at,
      });

    if (insertError) {
      console.error("Failed to insert delivery event:", insertError);
    }

    // Update email_logs status for final states
    if (["delivered", "bounced", "complained"].includes(eventType)) {
      const updateData: Record<string, any> = {};
      
      if (eventType === "delivered") {
        updateData.status = "delivered";
      } else if (eventType === "bounced") {
        updateData.status = "bounced";
        updateData.error_message = payload.data.bounce?.message || "Email bounced";
      } else if (eventType === "complained") {
        updateData.status = "complained";
        updateData.error_message = `Spam complaint: ${payload.data.complaint?.feedback_type || "unknown"}`;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("email_logs")
          .update(updateData)
          .eq("id", emailLog.id);

        if (updateError) {
          console.error("Failed to update email log status:", updateError);
        }
      }
    }

    return new Response(JSON.stringify({ received: true, eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);