import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const generateEmailHTML = (type: string, data: any): { subject: string; html: string } => {
  const storeName = data.store_name || 'Our Store';
  const orderNumber = data.order_number || '';
  const customerName = data.customer_name || 'Customer';

  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 600px; margin: 0 auto; padding: 32px 24px;
    background: #ffffff; color: #1a1a1a;
  `;

  const headerStyle = `
    text-align: center; padding-bottom: 24px;
    border-bottom: 2px solid #f0f0f0; margin-bottom: 24px;
  `;

  if (type === 'order_confirmed') {
    return {
      subject: `Order Confirmed — ${orderNumber} | ${storeName}`,
      html: `<div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="font-size:20px; margin:0;">${storeName}</h1>
        </div>
        <h2 style="font-size:18px; color:#16a34a;">✓ Order Confirmed</h2>
        <p>Hi ${customerName},</p>
        <p>Your order <strong>${orderNumber}</strong> has been confirmed and is being processed.</p>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          ${(data.items || []).map((item: any) => `
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:8px 0;">${item.title} × ${item.quantity}</td>
              <td style="padding:8px 0; text-align:right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
          <tr>
            <td style="padding:12px 0; font-weight:bold;">Total</td>
            <td style="padding:12px 0; text-align:right; font-weight:bold;">₹${data.total?.toLocaleString('en-IN') || '0'}</td>
          </tr>
        </table>
        <p style="color:#666; font-size:13px;">We'll notify you when your order ships.</p>
        <p style="margin-top:24px;">Thank you for shopping with ${storeName}!</p>
      </div>`,
    };
  }

  if (type === 'order_shipped') {
    return {
      subject: `Your Order Has Shipped — ${orderNumber} | ${storeName}`,
      html: `<div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="font-size:20px; margin:0;">${storeName}</h1>
        </div>
        <h2 style="font-size:18px; color:#2563eb;">📦 Order Shipped</h2>
        <p>Hi ${customerName},</p>
        <p>Great news! Your order <strong>${orderNumber}</strong> has been shipped.</p>
        ${data.tracking_number ? `
          <div style="background:#f7f7f7; padding:16px; border-radius:8px; margin:16px 0;">
            <p style="margin:0; font-size:13px; color:#666;">Tracking Number</p>
            <p style="margin:4px 0 0; font-size:16px; font-weight:bold; font-family:monospace;">${data.tracking_number}</p>
          </div>
        ` : ''}
        <p style="color:#666; font-size:13px;">You'll receive your order soon!</p>
        <p style="margin-top:24px;">Thank you for shopping with ${storeName}!</p>
      </div>`,
    };
  }

  if (type === 'new_order_seller') {
    return {
      subject: `🔔 New Order Received — ${orderNumber}`,
      html: `<div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="font-size:20px; margin:0;">${storeName} — New Order</h1>
        </div>
        <h2 style="font-size:18px;">New Order: ${orderNumber}</h2>
        <p><strong>Customer:</strong> ${customerName}</p>
        ${data.customer_phone ? `<p><strong>Phone:</strong> ${data.customer_phone}</p>` : ''}
        ${data.customer_email ? `<p><strong>Email:</strong> ${data.customer_email}</p>` : ''}
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          ${(data.items || []).map((item: any) => `
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:8px 0;">${item.title} × ${item.quantity}</td>
              <td style="padding:8px 0; text-align:right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
          <tr>
            <td style="padding:12px 0; font-weight:bold;">Total</td>
            <td style="padding:12px 0; text-align:right; font-weight:bold;">₹${data.total?.toLocaleString('en-IN') || '0'}</td>
          </tr>
        </table>
        <p>Payment: <strong>${data.payment_method || 'N/A'}</strong></p>
      </div>`,
    };
  }

  return { subject: 'Notification', html: '<p>Notification from your store.</p>' };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, order_id, store_id } = await req.json();

    if (!type || !order_id || !store_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch store
    const { data: store } = await supabase
      .from('stores')
      .select('name, user_id')
      .eq('id', store_id)
      .single();

    const storeName = store?.name || 'Store';

    // Fetch seller email
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', store?.user_id)
      .single();

    const emailData = {
      store_name: storeName,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      items: order.items,
      total: order.total,
      tracking_number: order.tracking_number,
      payment_method: order.payment_method,
    };

    const results: string[] = [];

    // Send customer email
    if ((type === 'order_confirmed' || type === 'order_shipped') && order.customer_email) {
      const { subject, html } = generateEmailHTML(type, emailData);
      
      const emailRes = await fetch('https://api.lovable.dev/v1/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          to: order.customer_email,
          subject,
          html,
          from: `${storeName} <noreply@lovable.dev>`,
        }),
      });

      results.push(`customer_email: ${emailRes.ok ? 'sent' : 'failed'}`);
    }

    // Send seller notification for new orders
    if (type === 'new_order_seller' && store?.user_id) {
      // Get seller's auth email
      const { data: authUser } = await supabase.auth.admin.getUserById(store.user_id);
      const sellerEmail = authUser?.user?.email;

      if (sellerEmail) {
        const { subject, html } = generateEmailHTML('new_order_seller', emailData);
        
        const emailRes = await fetch('https://api.lovable.dev/v1/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            to: sellerEmail,
            subject,
            html,
            from: `${storeName} <noreply@lovable.dev>`,
          }),
        });

        results.push(`seller_email: ${emailRes.ok ? 'sent' : 'failed'}`);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
