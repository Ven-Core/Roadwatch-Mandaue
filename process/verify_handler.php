<?php
session_start();
require_once '../config/database.php';
require_once '../config/mail_config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Please login first']);
    exit();
}

$action = isset($_POST['action']) ? $_POST['action'] : '';

switch ($action) {
    case 'verify':
        handleVerify($conn);
        break;
    case 'resend_otp':
        handleResendOTP($conn);
        break;
    case 'send_initial':
        handleSendInitial($conn);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        break;
}

function generateOTP() {
    return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function handleVerify($conn) {
    $otp_code = isset($_POST['otp_code']) ? trim($_POST['otp_code']) : '';
    
    if (empty($otp_code) || strlen($otp_code) !== 6) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid verification code']);
        exit();
    }

    $user_id = $_SESSION['user_id'];
    
    $check_query = "SELECT * FROM otp_codes WHERE email = (SELECT email FROM users WHERE id = ?) AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1";
    $check_stmt = $conn->prepare($check_query);
    $check_stmt->bind_param("is", $user_id, $otp_code);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid or expired verification code']);
        exit();
    }

    $otp_data = $check_result->fetch_assoc();

    $mark_used_query = "UPDATE otp_codes SET used = 1 WHERE id = ?";
    $mark_used_stmt = $conn->prepare($mark_used_query);
    $mark_used_stmt->bind_param("i", $otp_data['id']);
    $mark_used_stmt->execute();

    $verify_user_query = "UPDATE users SET is_verified = 1 WHERE id = ?";
    $verify_user_stmt = $conn->prepare($verify_user_query);
    $verify_user_stmt->bind_param("i", $user_id);
    $verify_user_stmt->execute();

    $_SESSION['is_verified'] = 1;

    echo json_encode([
        'status' => 'success',
        'message' => 'Account verified successfully!',
        'redirect' => 'index.html'
    ]);
}

function handleSendInitial($conn) {
    $user_id = $_SESSION['user_id'];
    
    $user_query = "SELECT email, full_name, is_verified FROM users WHERE id = ?";
    $user_stmt = $conn->prepare($user_query);
    $user_stmt->bind_param("i", $user_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    
    if ($user_result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
        exit();
    }
    
    $user = $user_result->fetch_assoc();
    
    if ($user['is_verified'] == 1) {
        echo json_encode(['status' => 'success', 'message' => 'Account already verified']);
        exit();
    }

    $check_valid_otp = "SELECT id FROM otp_codes WHERE email = ? AND used = 0 AND expires_at > NOW() LIMIT 1";
    $check_valid_stmt = $conn->prepare($check_valid_otp);
    $check_valid_stmt->bind_param("s", $user['email']);
    $check_valid_stmt->execute();
    $check_valid_result = $check_valid_stmt->get_result();
    
    if ($check_valid_result->num_rows > 0) {
        $valid_otp = $check_valid_result->fetch_assoc();
        
        echo json_encode([
            'status' => 'info',
            'message' => 'Valid verification code already sent. Check your email.',
            'has_valid_otp' => true
        ]);
        exit();
    }

    $otp_code = generateOTP();
    $expires_at = date('Y-m-d H:i:s', strtotime('+5 minutes'));

    $insert_query = "INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)";
    $insert_stmt = $conn->prepare($insert_query);
    $insert_stmt->bind_param("sss", $user['email'], $otp_code, $expires_at);
    
    if (!$insert_stmt->execute()) {
        error_log("Failed to insert OTP: " . $insert_stmt->error);
        echo json_encode(['status' => 'error', 'message' => 'Failed to generate verification code']);
        exit();
    }

    $email_sent = sendOTPEmail($user['email'], $user['full_name'], $otp_code);

    if ($email_sent) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Verification code sent to your email'
        ]);
    } else {
        error_log("Failed to send OTP email to: " . $user['email']);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to send verification email. Please check your email address.'
        ]);
    }
}

function handleResendOTP($conn) {
    $user_id = $_SESSION['user_id'];
    
    $user_query = "SELECT email, full_name, is_verified FROM users WHERE id = ?";
    $user_stmt = $conn->prepare($user_query);
    $user_stmt->bind_param("i", $user_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    
    if ($user_result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
        exit();
    }
    
    $user = $user_result->fetch_assoc();
    
    if ($user['is_verified'] == 1) {
        echo json_encode(['status' => 'success', 'message' => 'Account already verified']);
        exit();
    }

    $mark_expired_query = "UPDATE otp_codes SET used = 1 WHERE email = ? AND used = 0 AND expires_at < NOW()";
    $mark_expired_stmt = $conn->prepare($mark_expired_query);
    $mark_expired_stmt->bind_param("s", $user['email']);
    $mark_expired_stmt->execute();

    $check_valid_otp = "SELECT id, created_at FROM otp_codes WHERE email = ? AND used = 0 AND expires_at > NOW() LIMIT 1";
    $check_valid_stmt = $conn->prepare($check_valid_otp);
    $check_valid_stmt->bind_param("s", $user['email']);
    $check_valid_stmt->execute();
    $check_valid_result = $check_valid_stmt->get_result();
    
    if ($check_valid_result->num_rows > 0) {
        $valid_otp = $check_valid_result->fetch_assoc();
        $created_time = strtotime($valid_otp['created_at']);
        $current_time = time();
        $time_diff = $current_time - $created_time;
        $remaining_seconds = 60 - $time_diff;
        
        if ($remaining_seconds > 0) {
            echo json_encode([
                'status' => 'cooldown',
                'message' => 'Please wait ' . ceil($remaining_seconds / 60) . ' minute(s) before requesting a new code',
                'remaining_seconds' => $remaining_seconds
            ]);
            exit();
        }
    }

    $otp_code = generateOTP();
    $expires_at = date('Y-m-d H:i:s', strtotime('+5 minutes'));

    $insert_query = "INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)";
    $insert_stmt = $conn->prepare($insert_query);
    $insert_stmt->bind_param("sss", $user['email'], $otp_code, $expires_at);
    
    if (!$insert_stmt->execute()) {
        error_log("Failed to insert OTP: " . $insert_stmt->error);
        echo json_encode(['status' => 'error', 'message' => 'Failed to generate verification code']);
        exit();
    }

    $email_sent = sendOTPEmail($user['email'], $user['full_name'], $otp_code);

    if ($email_sent) {
        echo json_encode([
            'status' => 'success',
            'message' => 'New verification code sent to your email'
        ]);
    } else {
        error_log("Failed to resend OTP email to: " . $user['email']);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to send email. Please try again later.'
        ]);
    }
}

$conn->close();
?>