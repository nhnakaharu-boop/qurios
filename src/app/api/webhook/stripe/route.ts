import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe v17: updated API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-04-30.basil',
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook signature verification failed:', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Use admin Supabase (no cookies needed for webhook)
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price.id ?? '';

      let plan = 'free';
      if (priceId === process.env.STRIPE_STUDENT_PAID_PRICE_ID)         plan = 'student_paid';
      else if (priceId === process.env.STRIPE_STUDENT_PAID_PLUS_PRICE_ID) plan = 'student_paid_plus';
      else if (priceId === process.env.STRIPE_TUTOR_PAID_PRICE_ID)      plan = 'tutor_paid';

      const expires = sub.status === 'active'
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      await supabase.from('profiles')
        .update({ plan, plan_expires_at: expires, stripe_subscription_id: sub.id })
        .eq('stripe_customer_id', customerId);

      // Give student_paid plan 30 tickets monthly
      if (plan === 'student_paid' && event.type === 'customer.subscription.updated') {
        const { data: p } = await supabase.from('profiles').select('ticket_count').eq('stripe_customer_id', customerId).single();
        if (p) {
          await supabase.from('profiles').update({ ticket_count: (p.ticket_count ?? 0) + 30 }).eq('stripe_customer_id', customerId);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('profiles')
        .update({ plan: 'free', plan_expires_at: null, stripe_subscription_id: null })
        .eq('stripe_customer_id', sub.customer as string);
      break;
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { userId, type, lessonId } = pi.metadata;
      await supabase.from('payments').insert({
        user_id: userId,
        lesson_id: lessonId || null,
        stripe_payment_intent_id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        type: type || 'one_time',
        status: 'completed',
      }).catch(() => {}); // payments table may not exist yet
      break;
    }

    default:
      // Unhandled event type — not an error
      break;
  }

  return NextResponse.json({ received: true });
}
