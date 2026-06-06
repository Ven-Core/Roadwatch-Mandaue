function checkSession() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'process/check_session.php',
            type: 'GET',
            dataType: 'json',
            success: function(response) {
                resolve(response);
            },
            error: function(xhr, status, error) {
                reject(error);
            }
        });
    });
}

function redirectIfAuthenticated() {
    checkSession()
        .then(function(response) {
            if (response.status === 'success' && response.logged_in === true) {
                if (response.is_verified == 1) {
                    window.location.href = 'index.html';
                } else if (response.is_verified == 0) {
                    window.location.href = 'verify.html';
                }
            }
        })
        .catch(function(error) {
            console.log('Session check failed:', error);
        });
}

function redirectIfLoggedIn() {
    checkSession()
        .then(function(response) {
            if (response.status === 'success' && response.logged_in === true) {
                window.location.href = 'index.html';
            }
        })
        .catch(function(error) {
            console.log('Session check failed:', error);
        });
}

function requireAuth() {
    checkSession()
        .then(function(response) {
            if (response.status !== 'success' || response.logged_in !== true) {
                window.location.href = 'login.html';
            } else if (response.is_verified == 0) {
                window.location.href = 'verify.html';
            }
        })
        .catch(function(error) {
            window.location.href = 'login.html';
        });
}

function requireVerified() {
    checkSession()
        .then(function(response) {
            if (response.status !== 'success' || response.logged_in !== true) {
                window.location.href = 'login.html';
            } else if (response.is_verified == 0) {
                window.location.href = 'verify.html';
            } else if (response.is_Ban == 1) {
                window.location.href = 'banned.html';
            }
        })
        .catch(function(error) {
            window.location.href = 'login.html';
        });
}

function requireUnauth() {
    checkSession()
        .then(function(response) {
            if (response.status === 'success' && response.logged_in === true) {
                if (response.is_verified == 1) {
                    window.location.href = 'index.html';
                } else if (response.is_verified == 0) {
                    window.location.href = 'verify.html';
                }
            }
        })
        .catch(function(error) {
            console.log('Session check failed:', error);
        });
}

function checkVerificationStatus() {
    checkSession()
        .then(function(response) {
            if (response.status !== 'success' || response.logged_in !== true) {
                window.location.href = 'login.html';
                return;
            }

            if (response.is_verified == 1) {
                window.location.href = 'index.html';
                return;
            }
        })
        .catch(function(error) {
            window.location.href = 'login.html';
        });
}

function isLoggedIn() {
    return checkSession()
        .then(function(response) {
            return response.status === 'success' && response.logged_in === true;
        })
        .catch(function(error) {
            return false;
        });
}

function isVerified() {
    return checkSession()
        .then(function(response) {
            return response.status === 'success' && response.logged_in === true && response.is_verified == 1;
        })
        .catch(function(error) {
            return false;
        });
}

function isBanned() {
    return checkSession()
        .then(function(response) {
            return response.status === 'success' && response.logged_in === true && response.is_Ban == 1;
        })
        .catch(function(error) {
            return false;
        });
}

function getUserData() {
    return checkSession()
        .then(function(response) {
            if (response.status === 'success' && response.logged_in === true) {
                return {
                    user_id: response.user_id,
                    username: response.username,
                    email: response.email,
                    full_name: response.full_name,
                    usertype: response.usertype,
                    is_verified: response.is_verified,
                    is_dark: response.is_dark,
                    is_Ban: response.is_Ban,
                    is_Mute: response.is_Mute,
                    profile_picture: response.profile_picture
                };
            }
            return null;
        })
        .catch(function(error) {
            return null;
        });
}