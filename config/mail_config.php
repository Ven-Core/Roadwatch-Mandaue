<?php
require_once __DIR__ . '/../lib/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/src/SMTP.php';
require_once __DIR__ . '/../lib/PHPMailer/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

function sendOTPEmail($email, $full_name, $otp_code) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'ADD_EMAIL_PO';
        $mail->Password = 'PASSWORD_DIRI';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->setFrom('ADD_EMAIL_PO', 'RoadWatch Mandaue');
        $mail->addAddress($email, $full_name);
        $mail->isHTML(true);
        $mail->Subject = 'Verify Your RoadWatch Account';
        $mail->Body = '
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f1f5f9;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
                <tr>
                    <td align="center">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
                            <tr>
                                <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px 24px;text-align:center;">
                                    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">RoadWatch Mandaue</h1>
                                    <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;font-weight:500;">Alang sa Luwas nga Dalan</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:32px 24px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding-bottom:8px;">
                                                <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 12px;">Verify Your Account</h2>
                                                <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 6px;">Hello <strong>' . htmlspecialchars($full_name) . '</strong>,</p>
                                                <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">Thank you for joining! Use the code below to verify your account:</p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center" style="padding:20px 0;">
                                                <table cellpadding="0" cellspacing="0" style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:20px 28px;">
                                                    <tr>
                                                        <td style="font-size:36px;font-weight:800;letter-spacing:10px;color:#2563eb;text-align:center;">' . $otp_code . '</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-top:8px;">
                                                <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:6px;margin-bottom:20px;">
                                                    <p style="color:#991b1b;font-size:13px;margin:0;line-height:1.5;">⚠️ This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
                                                </div>
                                                <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">If you did not create this account, please ignore this email or contact support.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="background:#f8fafc;padding:20px 24px;text-align:center;border-top:1px solid #e2e8f0;">
                                    <p style="color:#94a3b8;font-size:12px;margin:0;">© ' . date('Y') . ' RoadWatch Mandaue. Powered by NovateX Studios</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>';
        $mail->AltBody = "Your verification code is: $otp_code. This code expires in 5 minutes.";
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("OTP Email failed: " . $mail->ErrorInfo);
        return false;
    }
}

function sendPasswordResetEmail($email, $full_name, $otp_code) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'ADD_EMAIL_PO';
        $mail->Password = 'PASSWORD_DIRI';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->setFrom('ADD_EMAIL_PO', 'RoadWatch Mandaue');
        $mail->addAddress($email, $full_name);
        $mail->isHTML(true);
        $mail->Subject = 'Reset Your RoadWatch Password';
        $mail->Body = '
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f1f5f9;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
                <tr>
                    <td align="center">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
                            <tr>
                                <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:30px 24px;text-align:center;">
                                    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">RoadWatch Mandaue</h1>
                                    <p style="color:#fecaca;margin:6px 0 0;font-size:13px;font-weight:500;">Password Reset Request</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:32px 24px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding-bottom:8px;">
                                                <h2 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 12px;">Reset Your Password</h2>
                                                <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 6px;">Hello <strong>' . htmlspecialchars($full_name) . '</strong>,</p>
                                                <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">We received a password reset request. Use the code below to reset your password:</p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center" style="padding:20px 0;">
                                                <table cellpadding="0" cellspacing="0" style="background:#fef2f2;border:2px dashed #dc2626;border-radius:12px;padding:20px 28px;">
                                                    <tr>
                                                        <td style="font-size:36px;font-weight:800;letter-spacing:10px;color:#dc2626;text-align:center;">' . $otp_code . '</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-top:8px;">
                                                <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:6px;margin-bottom:20px;">
                                                    <p style="color:#991b1b;font-size:13px;margin:0;line-height:1.5;">⚠️ This code expires in <strong>5 minutes</strong>. If you did not request this, ignore this email.</p>
                                                </div>
                                                <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">For security, never share this code with anyone.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="background:#f8fafc;padding:20px 24px;text-align:center;border-top:1px solid #e2e8f0;">
                                    <p style="color:#94a3b8;font-size:12px;margin:0;">© ' . date('Y') . ' RoadWatch Mandaue. Powered by NovateX Studios</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>';
        $mail->AltBody = "Your password reset code is: $otp_code. This code expires in 5 minutes.";
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Password Reset Email failed: " . $mail->ErrorInfo);
        return false;
    }
}

function sendNotificationEmail($email, $full_name, $subject, $message_body) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'havencharlespapasin@gmail.com';
        $mail->Password = 'dkqm xaho eaxx bgxk';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->setFrom('havencharlespapasin@gmail.com', 'RoadWatch Mandaue');
        $mail->addAddress($email, $full_name);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $message_body;
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Notification Email failed: " . $mail->ErrorInfo);
        return false;
    }
}
?>