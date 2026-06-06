$(document).ready(function () {
    setTimeout(function () {
        $('#skeletonLoader').hide();
        $('#mainContent').show();
        requireUnauth();
    }, 1500);
});

const notyf = new Notyf({
    duration: 2500,
    dismissible: true,
    ripple: true,
    position: { x: 'right', y: 'bottom' },
    types: [
        { type: 'success', background: '#10b981' },
        { type: 'error', background: '#ef4444' },
        { type: 'warning', background: '#f59e0b' },
        { type: 'info', background: '#3b82f6' }
    ]
});

const GOOGLE_CLIENT_ID = '141766128390-2okr50lur3ebmoupq4d1bsd8srhvcjjc.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = 'http://rw-mandaue.is-great.org/process/google_callback.php';

function loginWithGoogle() {
    if (!captchaVerified) {

        notyf.open({ type: 'error', message: 'Complete the captcha first!' });
        return;
    }

    notyf.open({ type: 'info', message: 'Redirecting to Google...' });
    setTimeout(() => {
        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
            'client_id=' + GOOGLE_CLIENT_ID +
            '&redirect_uri=' + encodeURIComponent(GOOGLE_REDIRECT_URI) +
            '&response_type=code' +
            '&scope=openid%20email%20profile' +
            '&access_type=offline';
        window.location.href = authUrl;
    }, 400);
}

$('#togglePasswordBtn').click(function (e) {
    e.preventDefault();
    const passwordInput = $('#loginPassword');
    const type = passwordInput.attr('type') === 'password' ? 'text' : 'password';
    passwordInput.attr('type', type);
    if (type === 'password') {
        $('#eyeIcon').html('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>');
    } else {
        $('#eyeIcon').html('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>');
    }
});

$('#loginForm').submit(function (e) {
    e.preventDefault();
    const identifier = $('#loginIdentifier').val().trim();
    const password = $('#loginPassword').val();
    const loginButton = $('#loginButton');
    const loginText = $('#loginText');
    const loginSpinner = $('#loginSpinner');

    if (!identifier || !password) {
        notyf.open({ type: 'error', message: 'Please fill in all fields' });
        return;
    }

    loginButton.prop('disabled', true);
    loginText.text('Signing in...');
    loginSpinner.show();

    $.ajax({
        url: 'process/account_handler.php',
        type: 'POST',
        dataType: 'json',
        data: {
            action: 'login',
            identifier: identifier,
            password: password,
            remember_me: $('#rememberMe').is(':checked') ? '1' : '0'
        },
        success: function (response) {
            setTimeout(function () {
                if (response.status === 'success') {
                    loginText.text('Success!');
                    notyf.open({ type: 'success', message: response.message || 'Login successful!' });
                    setTimeout(() => window.location.href = response.redirect || 'index.html', 1000);
                } else {
                    loginButton.prop('disabled', false);
                    loginText.text('Sign in');
                    loginSpinner.hide();
                    notyf.open({ type: 'error', message: response.message || 'Login failed' });
                }
            }, 2000);
        },
        error: function () {
            setTimeout(function () {
                loginButton.prop('disabled', false);
                loginText.text('Sign in');
                loginSpinner.hide();
                notyf.open({ type: 'error', message: 'Connection error. Please try again.' });
            }, 2000);
        }
    });
});

let captchaVerified = false;

function turnstileCallback(token) {
    captchaVerified = true;
}
