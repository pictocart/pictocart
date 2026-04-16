import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Default email HTML generators (fallback when no custom templates) ──

const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;color:#1a1a1a;`;
const headerStyle = `text-align:center;padding-bottom:24px;border-bottom:2px solid #f0f0f0;margin-bottom:24px;`;

function buildItemsTable(items: any[], total: number): string {
  const rows = (items || []).map((item: any) => `
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:8px 0;">${item.title} × ${item.quantity}</td>
      <td style="padding:8px 0;text-align:right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;margin:20px 0;">
    ${rows}
    <tr><td style="padding:12px 0;font-weight:bold;">Total</td>
    <td style="padding:12px 0;text-align:right;font-weight:bold;">₹${total?.toLocaleString('en-IN') || '0'}</td></tr>
  </table>`;
}

function defaultOrderConfirmed(d: any) {
  return {
    subject: `Order Confirmed — ${d.order_number} | ${d.store_name}`,
    html: `<div style="${baseStyle}"><div style="${headerStyle}"><h1 style="font-size:20px;margin:0;">${d.store_name}</h1></div><h2 style="font-size:18px;color:#16a34a;">✓ Order Confirmed</h2><p>Hi ${d.customer_name},</p><p>Your order <strong>${d.order_number}</strong> has been confirmed and is being processed.</p>${d.items_table}<p style="color:#666;font-size:13px;">We'll notify you when your order ships.</p><p style="margin-top:24px;">Thank you for shopping with ${d.store_name}!</p></div>`,
  };
}

function defaultOrderShipped(d: any) {
  return {
    subject: `Your Order Has Shipped — ${d.order_number} | ${d.store_name}`,
    html: `<div style="${baseStyle}"><div style="${headerStyle}"><h1 style="font-size:20px;margin:0;">${d.store_name}</h1></div><h2 style="font-size:18px;color:#2563eb;">📦 Order Shipped</h2><p>Hi ${d.customer_name},</p><p>Great news! Your order <strong>${d.order_number}</strong> has been shipped.</p>${d.tracking_number ? `<div style="background:#f7f7f7;padding:16px;border-radius:8px;margin:16px 0;"><p style="margin:0;font-size:13px;color:#666;">Tracking Number</p><p style="margin:4px 0 0;font-size:16px;font-weight:bold;font-family:monospace;">${d.tracking_number}</p></div>` : ''}<p style="margin-top:24px;">Thank you for shopping with ${d.store_name}!</p></div>`,
  };
}

function defaultOrderDelivered(d: any) {
  return {
    subject: `Order Delivered — ${d.order_number} | ${d.store_name}`,
    html: `<div style="${baseStyle}"><div style="${headerStyle}"><h1 style="font-size:20px;margin:0;">${d.store_name}</h1></div><h2 style="font-size:18px;color:#16a34a;">✅ Order Delivered</h2><p>Hi ${d.customer_name},</p><p>Your order <strong>${d.order_number}</strong> has been delivered successfully.</p>${d.items_table}<p style="color:#666;font-size:13px;">We hope you love your purchase!</p><p style="margin-top:24px;">Thank you for shopping with ${d.store_name}!</p></div>`,
  };
}

function defaultNewOrderSeller(d: any) {
  return {
    subject: `🔔 New Order Received — ${d.order_number}`,
    html: `<div style="${baseStyle}"><div style="${headerStyle}"><h1 style="font-size:20px;margin:0;">${d.store_name} — New Order</h1></div><h2 style="font-size:18px;">New Order: ${d.order_number}</h2><p><strong>Customer:</strong> ${d.customer_name}</p>${d.customer_phone ? `<p><strong>Phone:</strong> ${d.customer_phone}</p>` : ''}${d.customer_email ? `<p><strong>Email:</strong> ${d.customer_email}</p>` : ''}${d.items_table}<p>Payment: <strong>${d.payment_method || 'N/A'}</strong></p></div>`,
  };
}

const DEFAULT_GENERATORS: Record<string, (d: any) => { subject: string; html: string }> = {
  order_confirmed: defaultOrderConfirmed,
  order_shipped: defaultOrderShipped,
  order_delivered: defaultOrderDelivered,
  new_order_seller: defaultNewOrderSeller,
};

// ── Apply custom template with placeholder replacement ──

function applyCustomTemplate(template: { subject: string; html: string }, data: any): { subject: string; html: string } {
  const replacements: Record<string, string> = {
    '{{customer_name}}': data.customer_name || 'Customer',
    '{{order_number}}': data.order_number || '',
    '{{items_table}}': data.items_table || '',
    '{{total}}': `₹${data.total?.toLocaleString('en-IN') || '0'}`,
    '{{tracking_number}}': data.tracking_number || '',
    '{{store_name}}': data.store_name || '',
    '{{payment_method}}': data.payment_method || 'N/A',
    '{{customer_email}}': data.customer_email || '',
    '{{customer_phone}}': data.customer_phone || '',
  };

  let html = template.html;
  let subject = template.subject;
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replaceAll(placeholder, value);
    subject = subject.replaceAll(placeholder, value);
  }
  return { subject, html };
}

// ── Send email via Resend connector gateway ──

async function sendEmail(to: string, subject: string, html: string, fromName: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return false;
  }
  return true;
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, order_id, store_id } = await req.json();

    if (!type || !order_id || !store_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch order, store, and custom templates in parallel
    const [orderRes, storeRes, templatesRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', order_id).single(),
      supabase.from('stores').select('name, user_id').eq('id', store_id).single(),
      supabase.from('store_email_templates').select('templates').eq('store_id', store_id).maybeSingle(),
    ]);

    if (orderRes.error || !orderRes.data) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = orderRes.data;
    const store = storeRes.data;
    const storeName = store?.name || 'Store';
    const customTemplates = (templatesRes.data?.templates as any) || null;

    const itemsTable = buildItemsTable(order.items as any[], order.total as number);

    const emailData = {
      store_name: storeName,
      order_number: order.order_number,
      customer_name: order.customer_name || 'Customer',
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      items: order.items,
      items_table: itemsTable,
      total: order.total,
      tracking_number: order.tracking_number,
      payment_method: order.payment_method,
    };

    // Determine email content: custom template or default
    let emailContent: { subject: string; html: string } | null = null;

    if (customTemplates?.[type]?.html && customTemplates?.[type]?.subject) {
      // Use store's custom AI-generated template
      emailContent = applyCustomTemplate(customTemplates[type], emailData);
    } else if (DEFAULT_GENERATORS[type]) {
      // Fall back to default templates
      emailContent = DEFAULT_GENERATORS[type](emailData);
    } else {
      return new Response(JSON.stringify({ error: 'Unknown notification type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: string[] = [];

    // Customer email
    if (['order_confirmed', 'order_shipped', 'order_delivered'].includes(type) && order.customer_email) {
      const sent = await sendEmail(order.customer_email, emailContent.subject, emailContent.html, storeName);
      results.push(`customer_email: ${sent ? 'sent' : 'failed'}`);
    }

    // Seller notification for new orders
    if (type === 'new_order_seller' && store?.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(store.user_id);
      const sellerEmail = authUser?.user?.email;
      if (sellerEmail) {
        const sent = await sendEmail(sellerEmail, emailContent.subject, emailContent.html, storeName);
        results.push(`seller_email: ${sent ? 'sent' : 'failed'}`);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Notification error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
