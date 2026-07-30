// Simple edge function to send partner OTP verification emails.
// Bypasses the complex send-transactional-email pipeline (pgmq, unsubscribe tokens,
// suppression lists, etc.) and calls Resend API directly.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, otp: rawOtp } = await req.json()
    const otp = String(rawOtp ?? '').trim()
    const recipientEmail = String(email ?? '').trim()

    if (!recipientEmail || !otp) {
      return new Response(
        JSON.stringify({ error: 'email and otp are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#f8fafc;font-family:system-ui,sans-serif;padding:48px 16px;margin:0">
  <table align="center" style="max-width:500px;width:100%;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:40px 32px 32px">
    <tr><td style="text-align:center">
      <h1 style="font-size:26px;font-weight:800;color:#0f172a;margin:0 0 12px;letter-spacing:-0.025em">PicToCart Partner Program</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 32px">Verify your email address to access your Partner Dashboard.</p>
      <div style="background:linear-gradient(135deg,#4f46e5 0%,#3b82f6 100%);border-radius:14px;padding:28px 16px;margin:0 0 32px">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.15em">Your verification code</p>
        <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:0.25em;color:#ffffff;font-family:monospace">${otp}</p>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0 0 28px">This code expires in <strong>10 minutes</strong>.<br>If you did not request this, please ignore this email.</p>
      <p style="font-size:11px;color:#94a3b8;margin:0;padding-top:24px;border-top:1px solid #f1f5f9">Powered by Pic To Cart</p>
    </td></tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'PicToCart Partner <noreply@pictocart.in>',
        to: [recipientEmail],
        subject: `${otp} is your PicToCart Partner verification code`,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Resend API error:', res.status, errText)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', detail: errText.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resData = await res.json()
    console.log('Partner OTP email sent successfully:', resData.id)

    return new Response(
      JSON.stringify({ success: true, id: resData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('send-partner-otp error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
