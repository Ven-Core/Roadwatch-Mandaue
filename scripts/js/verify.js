        $(document).ready(function () {
            setTimeout(function() {
                $('#skeletonLoader').hide();
                $('#mainContent').show();
                checkVerificationStatus();
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

        let countdownInterval;
        let timeLeft = 300;
        let initialOTPSent = false;

        function checkVerificationStatus() {
            checkSession()
                .then(function (response) {
                    if (response.status !== 'success' || response.logged_in !== true) {
                        window.location.href = 'login.html';
                        return;
                    }

                    if (response.is_verified == 1) {
                        window.location.href = 'index.html';
                        return;
                    }

                    $('#userEmail').text(response.email);

                    if (response.is_verified == 0 && !initialOTPSent) {
                        const lastOTPSentTime = localStorage.getItem('lastOTPSentTime');
                        const currentTime = Date.now();

                        if (!lastOTPSentTime || currentTime - lastOTPSentTime > 300000) {
                            sendInitialOTP();
                        } else {
                            const remainingTime = Math.ceil((300000 - (currentTime - lastOTPSentTime)) / 1000);
                            notyf.open({ type: 'info', message: `Please wait ${remainingTime} seconds before requesting a new code.` });
                            startTimer(remainingTime);
                            setupOTPInputs();
                        }
                    }
                })
                .catch(function (error) {
                    window.location.href = 'login.html';
                });
        }

        function sendInitialOTP() {
            $.ajax({
                url: 'process/verify_handler.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'send_initial'
                },
                success: function (response) {
                    if (response.status === 'success') {
                        initialOTPSent = true;
                        localStorage.setItem('lastOTPSentTime', Date.now());
                        notyf.open({ type: 'success', message: 'Verification code sent to your email' });
                        startTimer(300);
                        setupOTPInputs();
                    } else if (response.status === 'info') {
                        startTimer(300);
                        setupOTPInputs();
                    } else if (response.status === 'cooldown') {
                        notyf.open({ type: 'warning', message: response.message });
                        startTimer(response.remaining_seconds || 300);
                        setupOTPInputs();
                    }
                },
                error: function () {
                    notyf.open({ type: 'error', message: 'Failed to send verification code' });
                }
            });
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
                        verifyOTP();
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
                        verifyOTP();
                    }
                });
            });
        }

        function getOTPCode() {
            const otp1 = $('#otp1').val();
            const otp2 = $('#otp2').val();
            const otp3 = $('#otp3').val();
            const otp4 = $('#otp4').val();
            const otp5 = $('#otp5').val();
            const otp6 = $('#otp6').val();

            return otp1 + otp2 + otp3 + otp4 + otp5 + otp6;
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
                    $('#timerText').addClass('hidden'); // Hide the timer text
                    $('#resendButton').prop('disabled', false); // Enable the resend button
                }

                if (timeLeft > 0) {
                    $('#timerText').removeClass('hidden'); // Ensure the timer text is visible
                    $('#resendButton').prop('disabled', true); // Keep the resend button disabled
                }
            }, 1000);
        }

        function updateTimerDisplay() {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            $('#countdown').text(
                String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
            );
            $('#timerText').html('Resend code after: <span id="countdown">' + $('#countdown').text() + '</span>');
        }

        function resetTimer(duration) {
            clearInterval(countdownInterval);
            startTimer(duration);
            $('#verifyButton').prop('disabled', false);
            $('#resendButton').prop('disabled', true);
            $('#timerText').removeClass('hidden');
        }

        function verifyOTP() {
            const otpCode = getOTPCode();

            if (otpCode.length < 6) {
                notyf.open({ type: 'error', message: 'Please enter the complete 6-digit code' });
                return;
            }

            const verifyButton = $('#verifyButton');
            const verifyText = $('#verifyText');
            const verifySpinner = $('#verifySpinner');

            verifyButton.prop('disabled', true);
            verifyText.text('Verifying...');
            verifySpinner.show();

            $.ajax({
                url: 'process/verify_handler.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'verify',
                    otp_code: otpCode
                },
                success: function (response) {
                    if (response.status === 'success') {
                        verifyText.text('Verified!');
                        verifySpinner.hide();
                        clearInterval(countdownInterval);
                        localStorage.removeItem('lastOTPSentTime');
                        notyf.open({ type: 'success', message: response.message || 'Account verified successfully!' });
                        setTimeout(function () {
                            window.location.href = 'index.html';
                        }, 1500);
                    } else {
                        verifyButton.prop('disabled', false);
                        verifyText.text('Verify Account');
                        verifySpinner.hide();
                        notyf.open({ type: 'error', message: response.message || 'Invalid verification code' });
                        clearOTPInputs();
                        $('#otp1').focus();
                    }
                },
                error: function () {
                    verifyButton.prop('disabled', false);
                    verifyText.text('Verify Account');
                    verifySpinner.hide();
                    notyf.open({ type: 'error', message: 'Connection error. Please try again.' });
                }
            });
        }

        function resendOTP() {
            const resendButton = $('#resendButton');
            const resendText = $('#resendText');
            const resendSpinner = $('#resendSpinner');

            resendButton.prop('disabled', true);
            resendText.text('Sending...');
            resendSpinner.show();

            $.ajax({
                url: 'process/verify_handler.php',
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'resend_otp'
                },
                success: function (response) {
                    if (response.status === 'success') {
                        resendSpinner.hide();
                        resendText.text('Resend Code');
                        localStorage.setItem('lastOTPSentTime', Date.now());
                        notyf.open({ type: 'success', message: 'New verification code sent!' });
                        resetTimer(300);
                        clearOTPInputs();
                        $('#otp1').focus();
                    } else if (response.status === 'cooldown') {
                        resendSpinner.hide();
                        resendText.text('Resend Code');
                        notyf.open({ type: 'warning', message: response.message });
                        resetTimer(response.remaining_seconds);
                    } else {
                        resendButton.prop('disabled', false);
                        resendText.text('Resend Code');
                        resendSpinner.hide();
                        notyf.open({ type: 'error', message: response.message || 'Failed to resend code' });
                    }
                },
                error: function () {
                    resendButton.prop('disabled', false);
                    resendText.text('Resend Code');
                    resendSpinner.hide();
                    notyf.open({ type: 'error', message: 'Connection error. Please try again.' });
                }
            });
        }

        function clearOTPInputs() {
            $('.otp-input').val('');
        }