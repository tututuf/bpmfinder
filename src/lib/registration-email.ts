export function registrationEmail(code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Invalid verification code.');
  return {
    subject: 'Your BPM Finder verification code',
    text: `Your BPM Finder verification code is ${code}. It expires in 10 minutes and can be used once to create your account. If you didn't request this, you can ignore this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#141414"><table role="presentation" style="width:100%;padding:40px 18px"><tr><td align="center"><table role="presentation" style="width:100%;max-width:480px;background:#fff;border:1px solid #dedad3;border-radius:12px;padding:32px"><tr><td><p style="font-size:22px;font-weight:bold;margin:0 0 36px">BPM <i>Finder</i><span style="color:#ff756b">.</span></p><h1 style="font-size:24px;margin:0 0 14px">One step to your account.</h1><p style="font-size:15px;line-height:1.8">Enter this code on the registration page:</p><p style="background:#141414;color:#ff756b;text-align:center;padding:24px 12px;border-radius:8px;font-family:monospace;font-size:36px;letter-spacing:8px">${code}</p><p style="font-size:13px;line-height:1.8;color:#666">This code expires in 10 minutes and works once. Keep it private.</p><p style="font-size:12px;line-height:1.8;color:#777;margin-top:30px">Didn't request an account? You can ignore this email.</p></td></tr></table></td></tr></table></body></html>`,
  };
}
