let captchaVerified = false;

function turnstileCallback(token) {
    captchaVerified = true;
}

$(document).ready(function () {
  setTimeout(function () {
    $('#skeletonLoader').hide();
    $('#mainContent').show();
    redirectIfAuthenticated();
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
const GOOGLE_REDIRECT_URI = 'http://localhost/rw/process/google_callback.php';

function showEmailForm() {
  $('#choiceButtons').addClass('hidden');
  $('#backBtn').addClass('show');
  $('#emailFormSection').addClass('active');
  $('#googleFormSection').removeClass('active');
}

function showGoogleForm() {
  $('#choiceButtons').addClass('hidden');
  $('#backBtn').addClass('show');
  $('#googleFormSection').addClass('active');
  $('#emailFormSection').removeClass('active');
}

function goBack() {
  $('#choiceButtons').removeClass('hidden');
  $('#backBtn').removeClass('show');
  $('#emailFormSection').removeClass('active');
  $('#googleFormSection').removeClass('active');
}

function registerWithGoogle() {
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
  const passwordInput = $('#regPassword');
  const type = passwordInput.attr('type') === 'password' ? 'text' : 'password';
  passwordInput.attr('type', type);
  if (type === 'password') {
    $('#eyeIcon').html('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>');
  } else {
    $('#eyeIcon').html('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>');
  }
});

$('#registerForm').submit(function (e) {
  e.preventDefault();
  const fullName = $('#regFullName').val().trim();
  const username = $('#regUsername').val().trim();
  const email = $('#regEmail').val().trim();
  const password = $('#regPassword').val();
  const confirmPassword = $('#regConfirmPassword').val();
  const registerButton = $('#registerButton');
  const registerText = $('#registerText');
  const registerSpinner = $('#registerSpinner');

  if (!fullName || !username || !email || !password || !confirmPassword) {
    notyf.open({ type: 'error', message: 'Please fill in all fields' });
    return;
  }
  if (password.length < 6) {
    notyf.open({ type: 'error', message: 'Password must be at least 6 characters' });
    return;
  }
  if (password !== confirmPassword) {
    notyf.open({ type: 'error', message: 'Passwords do not match' });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    notyf.open({ type: 'error', message: 'Please enter a valid email address' });
    return;
  }

  registerButton.prop('disabled', true);
  registerText.text('Creating Account...');
  registerSpinner.show();

  $.ajax({
    url: 'process/account_handler.php',
    type: 'POST',
    dataType: 'json',
    data: {
      action: 'register',
      full_name: fullName,
      username: username,
      email: email,
      password: password,
      confirm_password: confirmPassword
    },
    success: function (response) {
      setTimeout(function () {
        if (response.status === 'success') {
          registerText.text('Success!');
          notyf.open({ type: 'success', message: response.message || 'Account created! Redirecting...' });
          setTimeout(() => window.location.href = response.redirect || 'login.html', 1200);
        } else {
          registerButton.prop('disabled', false);
          registerText.text('Create Account');
          registerSpinner.hide();
          notyf.open({ type: 'error', message: response.message || 'Registration failed' });
        }
      }, 2800);
    },
    error: function () {
      setTimeout(function () {
        registerButton.prop('disabled', false);
        registerText.text('Create Account');
        registerSpinner.hide();
        notyf.open({ type: 'error', message: 'Connection error. Please try again.' });
      }, 2800);
    }
  });
});