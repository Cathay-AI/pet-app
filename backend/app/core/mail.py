import httpx
from app.core.config import settings

async def send_reset_password_email(email: str, username: str, token: str):
    """
    Send a password reset email using Resend API.
    If RESEND_API_KEY is not configured in .env, falls back to console logging.
    """
    reset_link = f"{settings.frontend_url}/reset-password?token={token}"

    if not settings.resend_api_key:
        print("\n" + "="*80)
        print("⚠️  RESEND_API_KEY NOT CONFIGURED. FALLBACK TO CONSOLE LOG:")
        print(f"🔑 PASSWORD RESET LINK FOR USER: {username} ({email})")
        print(f"🔗 URL: {reset_link}")
        print("="*80 + "\n")
        return

    # Call Resend REST API
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {settings.resend_api_key}",
        "Content-Type": "application/json",
    }
    
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 4px solid #3D2B1F; background-color: #FDF8F0; color: #3D2B1F;">
        <h2 style="font-weight: 900; margin-top: 0; color: #E8734A;">🔑 重設您的 Neko 密碼</h2>
        <p>哈囉 <strong>{username}</strong>，</p>
        <p>我們收到了您的帳號密碼重設請求。</p>
        <p>請點擊下方按鈕以重設密碼（此重設連結將在 15 分鐘後失效）：</p>
        <div style="margin: 25px 0;">
            <a href="{reset_link}" style="background-color: #E8734A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; border: 2px solid #3D2B1F; display: inline-block;">重設我的密碼</a>
        </div>
        <p style="font-size: 12px; color: #8B6F5E;">或者您也可以複製並在瀏覽器貼上此網址：<br/>
        <a href="{reset_link}" style="color: #D4A96A;">{reset_link}</a></p>
        <p style="font-size: 12px; color: #8B6F5E; margin-bottom: 0;">如果您並未發送此請求，請安全地忽略此電子郵件。</p>
    </div>
    """
    
    payload = {
        "from": settings.mail_from,
        "to": [email],
        "subject": "🔑 重設您的 Neko 帳號密碼",
        "html": html_content
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code != 200 and response.status_code != 201:
                print(f"❌ Resend API returned error status {response.status_code}: {response.text}")
                print("\n" + "="*80)
                print("⚠️  RESEND SENDING FAILED. FALLBACK TO CONSOLE LOG:")
                print(f"🔑 PASSWORD RESET LINK FOR USER: {username} ({email})")
                print(f"🔗 URL: {reset_link}")
                print("="*80 + "\n")
            else:
                print(f"📧 Password reset email successfully sent to {email} via Resend.")
    except Exception as exc:
        print(f"❌ Failed to connect to Resend API: {exc}")
        print("\n" + "="*80)
        print("⚠️  RESEND CONNECTION FAILED. FALLBACK TO CONSOLE LOG:")
        print(f"🔑 PASSWORD RESET LINK FOR USER: {username} ({email})")
        print(f"🔗 URL: {reset_link}")
        print("="*80 + "\n")

