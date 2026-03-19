import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-04-30.basil',
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { priceId?: string; type?: string; lessonId?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { priceId, type, lessonId } = body;
  if (!priceId || !type) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  // Validate priceId format (basic security check)
  if (!/^price_[a-zA-Z0-9_]+$/.test(priceId)) {
    return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', session.user.id)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', session.user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: type === 'subscription' ? 'subscription' : 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?success=1`,
    cancel_url: `${appUrl}/settings?tab=plan`,
    metadata: { userId: session.user.id, type, lessonId: lessonId ?? '' },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
