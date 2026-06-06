    $(document).ready(function () {
            setTimeout(function () {
                $('#skeletonLoader').hide();
                $('#mainContent').show();
            }, 1500);
        });

        const notyf = new Notyf({
            duration: 2500, dismissible: true, ripple: true,
            position: { x: 'right', y: 'bottom' },
            types: [
                { type: 'success', background: '#10b981' },
                { type: 'error', background: '#ef4444' },
                { type: 'warning', background: '#f59e0b' },
                { type: 'info', background: '#3b82f6' }
            ]
        });

        let currentStep = 1;
        let resetEmail = '';
        let countdownInterval;
        let timeLeft = 300;

        function setStep(step) {
            currentStep = step;
            $('#circle1, #circle2, #circle3').removeClass('active complete');
            $('#label1, #label2, #label3').removeClass('active complete');
            $('#line1, #line2').removeClass('complete');
            if (step >= 1) { $('#circle1').addClass('complete'); $('#label1').addClass('complete'); }
            if (step >= 2) { $('#circle2').addClass(step === 2 ? 'active' : 'complete'); $('#label2').addClass(step === 2 ? 'active' : 'complete'); $('#line1').addClass('complete'); }
            if (step >= 3) { $('#circle3').addClass('active'); $('#label3').addClass('active'); $('#line2').addClass('complete'); }
            $('#step1Content, #step2Content, #step3Content').removeClass('active');
            $('#step' + step + 'Content').addClass('active');
        }

        function setupOTPInputs() {
            const inputs = document.querySelectorAll('.otp-input');

            inputs.forEach((input, index) => {
                input.addEventListener('input', function (e) {
                    const value = this.value;

                    if (value.length === 1 && index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }

                    if (index === inputs.length - 1 && value.length === 1) {
                        verifyResetOTP();
                    }
                });

                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Backspace' && !this.value && index > 0) {
                        inputs[index - 1].focus();
                    }
                });

                input.addEventListener('paste', function (e) {
                    e.preventDefault();
                    const pastedData = e.clipboardData.getData('text');
                    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');

                    inputs.forEach((inp, i) => {
                        if (digits[i]) {
                            inp.value = digits[i];
                        }
                    });

                    if (digits.length === 6) {
                        verifyResetOTP();
                    }
                });
            });
        }

        function getOTPCode() {
            return $('#rotp1').val() + $('#rotp2').val() + $('#rotp3').val() + $('#rotp4').val() + $('#rotp5').val() + $('#rotp6').val();
        }

        function startTimer(duration) {
            timeLeft = duration;
            clearInterval(countdownInterval);
            updateTimerDisplay();
            countdownInterval = setInterval(function () {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                    $('#countdown').text('00:00');
                    $('#timerText').html('Code expired. <span>Request a new one</span>');
                    $('#verifyOtpBtn').prop('disabled', true);
                    $('#resendOtpBtn').prop('disabled', false);
                }
                if (timeLeft <= 240 && timeLeft > 0) { $('#resendOtpBtn').prop('disabled', false); }
            }, 1000);
        }

        function updateTimerDisplay() {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            $('#countdown').text(String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'));
        }

        function sendResetOTP() {
            resetEmail = $('#resetEmail').val().trim();
            if (!resetEmail) { notyf.open({ type: 'error', message: 'Please enter your email address' }); return; }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(resetEmail)) { notyf.open({ type: 'error', message: 'Please enter a valid email address' }); return; }
            $('#sendOtpBtn').prop('disabled', true); $('#sendOtpSpinner').show(); $('#sendOtpText').text('Sending...');
            $.ajax({
                url: 'process/account_handler.php', type: 'POST', dataType: 'json',
                data: { action: 'forgot_password', step: 'send_otp', email: resetEmail },
                success: function (response) {
                    $('#sendOtpBtn').prop('disabled', false); $('#sendOtpSpinner').hide(); $('#sendOtpText').text('Send Verification Code');
                    if (response.status === 'success') {
                        $('#displayEmail').text(resetEmail); setStep(2); setupOTPInputs(); startTimer(300);
                        notyf.open({ type: 'success', message: 'Verification code sent!' });
                    } else { notyf.open({ type: 'error', message: response.message || 'Failed to send code' }); }
                },
                error: function () { $('#sendOtpBtn').prop('disabled', false); $('#sendOtpSpinner').hide(); $('#sendOtpText').text('Send Verification Code'); notyf.open({ type: 'error', message: 'Connection error. Please try again.' }); }
            });
        }

        function verifyResetOTP() {
            const otpCode = getOTPCode();
            if (otpCode.length < 6) { notyf.open({ type: 'error', message: 'Please enter the complete 6-digit code' }); return; }
            $('#verifyOtpBtn').prop('disabled', true); $('#verifyOtpSpinner').show(); $('#verifyOtpText').text('Verifying...');
            $.ajax({
                url: 'process/account_handler.php', type: 'POST', dataType: 'json',
                data: { action: 'forgot_password', step: 'verify_otp', email: resetEmail, otp_code: otpCode },
                success: function (response) {
                    $('#verifyOtpBtn').prop('disabled', false); $('#verifyOtpSpinner').hide(); $('#verifyOtpText').text('Verify Code');
                    if (response.status === 'success') { clearInterval(countdownInterval); setStep(3); notyf.open({ type: 'success', message: 'Code verified! Enter new password.' }); }
                    else { notyf.open({ type: 'error', message: response.message || 'Invalid code' }); }
                },
                error: function () { $('#verifyOtpBtn').prop('disabled', false); $('#verifyOtpSpinner').hide(); $('#verifyOtpText').text('Verify Code'); notyf.open({ type: 'error', message: 'Connection error. Please try again.' }); }
            });
        }

        function resendResetOTP() {
            $('#resendOtpBtn').prop('disabled', true).text('Sending...');
            $.ajax({
                url: 'process/account_handler.php', type: 'POST', dataType: 'json',
                data: { action: 'forgot_password', step: 'send_otp', email: resetEmail },
                success: function (response) {
                    $('#resendOtpBtn').prop('disabled', true).text('Resend Code');
                    if (response.status === 'success') { startTimer(300); notyf.open({ type: 'success', message: 'New code sent!' }); }
                    else { $('#resendOtpBtn').prop('disabled', false).text('Resend Code'); notyf.open({ type: 'error', message: response.message || 'Failed to resend' }); }
                },
                error: function () { $('#resendOtpBtn').prop('disabled', false).text('Resend Code'); notyf.open({ type: 'error', message: 'Connection error. Please try again.' }); }
            });
        }

        function resetPassword() {
            const newPassword = $('#newPassword').val();
            const confirmNewPassword = $('#confirmNewPassword').val();
            if (!newPassword || !confirmNewPassword) { notyf.open({ type: 'error', message: 'Please fill in all fields' }); return; }
            if (newPassword.length < 6) { notyf.open({ type: 'error', message: 'Password must be at least 6 characters' }); return; }
            if (newPassword !== confirmNewPassword) { notyf.open({ type: 'error', message: 'Passwords do not match' }); return; }
            $('#resetPasswordBtn').prop('disabled', true); $('#resetPasswordSpinner').show(); $('#resetPasswordText').text('Resetting...');
            $.ajax({
                url: 'process/account_handler.php', type: 'POST', dataType: 'json',
                data: { action: 'forgot_password', step: 'reset_password', email: resetEmail, new_password: newPassword, confirm_password: confirmNewPassword },
                success: function (response) {
                    $('#resetPasswordBtn').prop('disabled', false); $('#resetPasswordSpinner').hide(); $('#resetPasswordText').text('Reset Password');
                    if (response.status === 'success') { notyf.open({ type: 'success', message: 'Password reset successfully!' }); setTimeout(function () { window.location.href = 'login.html'; }, 1500); }
                    else { notyf.open({ type: 'error', message: response.message || 'Failed to reset password' }); }
                },
                error: function () { $('#resetPasswordBtn').prop('disabled', false); $('#resetPasswordSpinner').hide(); $('#resetPasswordText').text('Reset Password'); notyf.open({ type: 'error', message: 'Connection error. Please try again.' }); }
            });
        }

        $('#toggleNewPasswordBtn').click(function (e) { e.preventDefault(); const input = $('#newPassword'); input.attr('type', input.attr('type') === 'password' ? 'text' : 'password'); });
        $('#toggleConfirmPasswordBtn').click(function (e) { e.preventDefault(); const input = $('#confirmNewPassword'); input.attr('type', input.attr('type') === 'password' ? 'text' : 'password'); });