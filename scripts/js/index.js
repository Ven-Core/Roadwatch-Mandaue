$(document).ready(function () {
    let sidebarOpen = false;
    const $wrapper = $('#miniSidebarWrapper');
    const $arrow = $('#sidebarArrow');
    function setSidebar(open) {
        sidebarOpen = open;
        if (open) { $wrapper.addClass('open'); $arrow.css('transform', 'rotate(180deg)'); $('#sidebarToggleBtn').attr('title', 'Close sidebar'); }
        else { $wrapper.removeClass('open'); $arrow.css('transform', 'rotate(0deg)'); $('#sidebarToggleBtn').attr('title', 'Open sidebar'); }
    }
    setSidebar(false);
    $('#sidebarToggleBtn').on('click', function () { setSidebar(!sidebarOpen); });
    $('#zoomInBtn').on('click', function () { if (window.map) { map.zoomIn({ duration: 300 }); } });
    $('#zoomOutBtn').on('click', function () { if (window.map) { map.zoomOut({ duration: 300 }); } });

    let userLocationMarker = null;
    let locationActive = false;
    $('#locateMeBtn').on('click', function () {
        if (locationActive) {
            if (userLocationMarker) { userLocationMarker.remove(); userLocationMarker = null; }
            $('#locateMeBtn').removeClass('locate-active'); $('#locateMeBtn').attr('title', 'Locate Me'); locationActive = false; return;
        }
        if (navigator.geolocation && window.map) {
            $('#locateMeBtn').prop('disabled', true);
            navigator.geolocation.getCurrentPosition(function (pos) {
                const lng = pos.coords.longitude; const lat = pos.coords.latitude;
                if (userLocationMarker) { userLocationMarker.remove(); }
                const pulseEl = document.createElement('div');
                pulseEl.className = 'user-location-pulse';
                pulseEl.style.cssText = 'width:16px;height:16px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 0 0 8px rgba(37,99,235,0.25),0 2px 8px rgba(0,0,0,0.2);animation:locationPulse 2s ease-out infinite;';
                userLocationMarker = new maplibregl.Marker({ element: pulseEl, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);
                map.flyTo({
                    center: [lng, lat],
                    zoom: 18,
                    duration: 700,
                    easing: (t) => 1 - Math.pow(1 - t, 3)
                });
                $('#locateMeBtn').addClass('locate-active'); $('#locateMeBtn').attr('title', 'Remove Location Pin'); $('#locateMeBtn').prop('disabled', false); locationActive = true;
            }, function (err) { $('#locateMeBtn').prop('disabled', false); notyf.open({ type: 'error', message: 'Location access denied.' }); }, { enableHighAccuracy: true, timeout: 8000 });
        } else { notyf.open({ type: 'error', message: 'Geolocation not supported.' }); }
    });

    $('#pinBtn').on('click', function () {
        if (!window.userAuthenticated) { notyf.open({ type: 'error', message: 'Please log-in to use this feature!' }); return; }
        openPinModal();
    });
});

let selectedPinLng = null;
let selectedPinLat = null;
let selectedPinAddress = '';
let pinMarker = null;
let pinSelectMode = false;
let pinStep = 1;

function openPinModal() {
    pinStep = 1;
    selectedPinLng = null; selectedPinLat = null; selectedPinAddress = '';
    if (pinMarker) { pinMarker.remove(); pinMarker = null; }
    pinSelectMode = false;
    map.getCanvas().style.cursor = '';
    $('#pinModalIcon').css({ background: '#dbeafe', color: '#2563eb' });
    $('#pinModalTitle').text('Step 1: Select Location');
    $('#pinModalText').text('Tap or click on the map to select your pin location');
    $('#pinStep1').show(); $('#pinStep2, #pinStep3').hide();
    $('#pinFooter').text('Only Mandaue City accepted!');
    $('#pinModal').addClass('show');
    const currentZoom = map.getZoom(); map.easeTo({ zoom: currentZoom - 0.2 });
}

function activatePinSelection() {
    $('#pinModal').removeClass('show');
    pinSelectMode = true;
    map.getCanvas().style.cursor = 'crosshair';
    notyf.open({ type: 'info', message: 'Tap on the map to place your pin' });
    map.once('click', handleMapClick);
}

function handleMapClick(e) {
    if (!pinSelectMode) return;
    selectedPinLng = e.lngLat.lng;
    selectedPinLat = e.lngLat.lat;
    map.getCanvas().style.cursor = '';
    if (pinMarker) { pinMarker.remove(); }
    const pinEl = document.createElement('div');
    pinEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="#dc2626" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>';
    pinMarker = new maplibregl.Marker({ element: pinEl, anchor: 'bottom' }).setLngLat([selectedPinLng, selectedPinLat]).addTo(map);
    map.flyTo({ center: [selectedPinLng, selectedPinLat], zoom: 18, speed: 1 });
    fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + selectedPinLat + '&lon=' + selectedPinLng)
        .then(res => res.json())
        .then(data => {
            selectedPinAddress = data.display_name || 'Unknown location';
            if (!selectedPinAddress.toLowerCase().includes('mandaue')) {
                notyf.open({ type: 'error', message: 'Select a location within Mandaue City only..' });
                if (pinMarker) { pinMarker.remove(); pinMarker = null; }
                selectedPinLng = null; selectedPinLat = null; selectedPinAddress = '';
                pinSelectMode = false;
                $('#pinModal').removeClass('show');
                return;
            }
            pinSelectMode = false;
            $('#pinModal').addClass('show');
            goToStep2();
        })
        .catch(function () {
            selectedPinAddress = 'Address not available';
            pinSelectMode = false;
            $('#pinModal').addClass('show');
            goToStep2();
        });
}

function goBackToStep1() {
    pinStep = 1;
    if (pinMarker) { pinMarker.remove(); pinMarker = null; }
    selectedPinLng = null; selectedPinLat = null; selectedPinAddress = '';
    pinSelectMode = false;
    map.getCanvas().style.cursor = '';
    $('#pinModalIcon').css({ background: '#dbeafe', color: '#2563eb' });
    $('#pinModalTitle').text('Step 1: Select Location');
    $('#pinModalText').text('Tap or click on the map to select your pin location');
    $('#pinStep1').show(); $('#pinStep2, #pinStep3').hide();
    $('#pinFooter').text('Only Mandaue City accepted!');
    $('#pinModal').removeClass('show');
    activatePinSelection();
}

function goToStep2() {
    pinStep = 2;
    $('#pinModalIcon').css({ background: '#dbeafe', color: '#2563eb' });
    $('#pinModalTitle').text('Step 2: Review Location');
    $('#pinModalText').text('Confirm the selected location details');
    $('#pinStep1').hide(); $('#pinStep2').show(); $('#pinStep3').hide();
    $('#pinAddress').text(selectedPinAddress);
    $('#pinLat').text(selectedPinLat.toFixed(6));
    $('#pinLng').text(selectedPinLng.toFixed(6));
    $('#pinFooter').text('Only Mandaue City accepted!');
    const currentZoom = map.getZoom(); map.easeTo({ zoom: currentZoom + 0.3 });
}

function goToStep3() {
    pinStep = 3;
    $('#pinModalIcon').css({ background: '#fef3c7', color: '#d97706' });
    $('#pinModalTitle').text('Step 3: Report Details');
    $('#pinModalText').text('Fill in the information about the incident');
    $('#pinStep1, #pinStep2').hide(); $('#pinStep3').show();
    $('#pinAddressLocked').val(selectedPinAddress);
    $('#pinDescription').val(''); $('#pinEvidence').val(''); $('#pinAnonymous').prop('checked', false);
    $('#pinFooter').text('Only Mandaue City accepted!');
    $('#evidencePreview').remove();
    $('#pinEvidence').after('<div id="evidencePreview" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;"></div>');
}

function closePinModal() {
    $('#pinModal').removeClass('show');
    pinSelectMode = false;
    map.getCanvas().style.cursor = '';
    if (pinMarker) { pinMarker.remove(); pinMarker = null; }
    selectedPinLng = null; selectedPinLat = null; selectedPinAddress = '';
    pinStep = 1;
    const currentZoom = map.getZoom(); map.easeTo({ zoom: currentZoom + 0.3 });
}

$('#pinModal').click(function (e) { if (e.target === this) { closePinModal(); } });

$(document).on('change', '#pinEvidence', function (e) {
    const files = Array.from(this.files);
    const $preview = $('#evidencePreview');
    $preview.empty();
    files.forEach((file, idx) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            const imgHtml = `
                        <div class="evidence-thumb" data-idx="${idx}">
                            <img src="${ev.target.result}">
                            <button class="evidence-remove" data-idx="${idx}">&times;</button>
                        </div>
                    `;
            $preview.append(imgHtml);
        };
        reader.readAsDataURL(file);
    });
});

$(document).on('click', '.evidence-remove', function (e) {
    e.preventDefault();
    const idx = Number($(this).attr('data-idx'));
    const input = document.getElementById('pinEvidence');
    let dt = new DataTransfer();
    const files = Array.from(input.files);
    files.forEach((file, i) => { if (i !== idx) dt.items.add(file); });
    input.files = dt.files;
    $(this).parent().remove();
    $('#pinEvidence').trigger('change');
});

function submitPin() {
    const description = $('#pinDescription').val().trim();
    if (!description) { notyf.open({ type: 'error', message: 'Please enter a description' }); return; }
    const isAnonymous = $('#pinAnonymous').is(':checked') ? 1 : 0;
    const evidenceFiles = $('#pinEvidence')[0].files;
    const formData = new FormData();
    formData.append('action', 'submit_pin');
    formData.append('lat', selectedPinLat);
    formData.append('lng', selectedPinLng);
    formData.append('address', selectedPinAddress);
    formData.append('description', description);
    formData.append('anonymous', isAnonymous);
    for (let i = 0; i < evidenceFiles.length; i++) { formData.append('evidence[]', evidenceFiles[i]); }
    $('#submitPinBtn').prop('disabled', true).text('Submitting...');
    $.ajax({
        url: 'process/pin_handler.php',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        dataType: 'json',
        success: function (response) {
            $('#submitPinBtn').prop('disabled', false).text('Submit');
            if (response.status === 'success') {
                notyf.open({ type: 'success', message: 'Report submitted!' });
                closePinModal();
                if (response.pin) {
                    addPinToMap(response.pin);
                } else {
                    fetchPins();
                }
            } else {
                notyf.open({ type: 'error', message: response.message || 'Failed to submit' });
            }
        },
        error: function () {
            $('#submitPinBtn').prop('disabled', false).text('Submit');
            notyf.open({ type: 'error', message: 'Connection error' });
        }
    });
}

$(document).ready(function () {
    setTimeout(function () { $('#skeletonLoader').fadeOut(500); }, 800);
    checkAuthStatus(); initMap();
    $(window).on('pageshow', function () { checkAuthStatus(); });
});

const notyf = new Notyf({
    duration: 2500, dismissible: true, ripple: true, position: { x: 'right', y: 'bottom' },
    types: [{ type: 'success', background: '#10b981' }, { type: 'error', background: '#ef4444' }, { type: 'warning', background: '#f59e0b' }, { type: 'info', background: '#3b82f6' }]
});

let map;
window.userAuthenticated = false;
const mandaueCenter = [123.938179, 10.344593];
const defaultZoom = 12.7;

function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {
                'osm-tiles': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                    maxzoom: 19
                }
            },
            layers: [{
                id: 'osm-tiles-layer',
                type: 'raster',
                source: 'osm-tiles',
                minzoom: 0,
                maxzoom: 19
            }]
        },
        center: mandaueCenter,
        zoom: defaultZoom,
        attributionControl: false,
        maxZoom: 18,
        minZoom: 5
    });
    map.on('load', function () { fetchPins(); });
    map.on('click', () => {
        document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
    });
}

function checkAuthStatus() {
    if (typeof checkSession === 'function') {
        checkSession().then(function (response) {
            if (response.status === 'success' && response.logged_in === true) {
                window.userAuthenticated = true;
                $('#authButtons').addClass('hidden'); $('#profileContainer').removeClass('hidden'); loadUserProfile();
                if (response.is_dark == 1) {
                    $('#map').addClass('dark-mode');
                } else {
                    $('#map').removeClass('dark-mode');
                }
            } else {
                window.userAuthenticated = false;
                $('#authButtons').removeClass('hidden'); $('#profileContainer').addClass('hidden'); $('#map').removeClass('dark-mode');
            }
        }).catch(function () {
            window.userAuthenticated = false;
            $('#authButtons').removeClass('hidden'); $('#profileContainer').addClass('hidden'); $('#map').removeClass('dark-mode');
        });
    } else {
        window.userAuthenticated = false;
        $('#authButtons').removeClass('hidden'); $('#profileContainer').addClass('hidden');
    }
}

function toggleDropdown() { $('#profileDropdown').toggleClass('show'); $('#creditsPopup').removeClass('show'); }
function toggleCredits() { $('#creditsPopup').toggleClass('show'); $('#profileDropdown').removeClass('show'); }

function toggleChat() {
    const chatOpen = $('#chatContainer').hasClass('show');
    if (chatOpen) {
        $('#chatContainer').removeClass('show');
        $('#robotBtn').show();

        setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.style.height = '100%';
            if (/Android/i.test(navigator.userAgent)) {
                document.body.style.minHeight = '100vh';
                setTimeout(() => {
                    document.body.style.minHeight = '';
                }, 300);
            }
        }, 100);
    }
    else {
        $('#chatContainer').addClass('show');
        $('#robotBtn').hide();
        $('#creditsPopup').removeClass('show');
        $('#profileDropdown').removeClass('show');
        $('#chatInput').focus();


        window.scrollTo(0, document.body.scrollHeight);
    }
}

$(document).click(function (e) {
    if (!$(e.target).closest('.profile-container').length) { $('#profileDropdown').removeClass('show'); }
    if (!$(e.target).closest('.credits-btn').length && !$(e.target).closest('.credits-popup').length) { $('#creditsPopup').removeClass('show'); }
});

function handleChatKey(e) { if (e.which === 13) { sendMessage(); } }

async function sendMessage() { const input = $('#chatInput'); const message = input.val().trim(); if (!message) return; const messagesContainer = $('#chatMessages'); messagesContainer.append('<div class="message user"><div class="message-bubble">' + escapeHtml(message) + '</div></div>'); input.val(''); messagesContainer.scrollTop(messagesContainer[0].scrollHeight); const typingId = 'typing-' + Date.now(); const typingHtml = '<div class="message ai" id="' + typingId + '"><div class="message-avatar"><img src="assets/robot.png" alt="Max"></div><div class="message-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>'; messagesContainer.append(typingHtml); messagesContainer.scrollTop(messagesContainer[0].scrollHeight); try { const response = await sendToGroq(message); $('#' + typingId).remove(); const responseId = 'response-' + Date.now(); const responseDiv = $('<div class="message ai" id="' + responseId + '"><div class="message-avatar"><img src="assets/robot.png" alt="Max"></div><div class="message-bubble" id="bubble-' + responseId + '"></div></div>'); messagesContainer.append(responseDiv); messagesContainer.scrollTop(messagesContainer[0].scrollHeight); typewriterEffect($('#bubble-' + responseId), response); } catch (error) { $('#' + typingId).remove(); messagesContainer.append('<div class="message ai"><div class="message-avatar"><img src="assets/robot.png" alt="Max"></div><div class="message-bubble">Connection error. Please try again later.</div></div>'); messagesContainer.scrollTop(messagesContainer[0].scrollHeight); } }

function typewriterEffect(element, text, speed = 20) { element.text(''); let i = 0; function type() { if (i < text.length) { if (text.charAt(i) === '*' && text.charAt(i + 1) === '*') { const endBold = text.indexOf('**', i + 2); if (endBold !== -1) { const boldText = text.substring(i + 2, endBold); element.append(document.createTextNode(' ')); const strong = document.createElement('strong'); strong.textContent = boldText; element.append(strong); element.append(document.createTextNode(' ')); i = endBold + 2; } else { element.append(document.createTextNode(text.charAt(i))); i++; } } else if (text.charAt(i) === '\n') { element.append(document.createElement('br')); i++; } else { element.append(document.createTextNode(text.charAt(i))); i++; } $('#chatMessages').scrollTop($('#chatMessages')[0].scrollHeight); setTimeout(type, speed); } } type(); }

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function showLogoutModal() { $('#profileDropdown').removeClass('show'); $('#logoutModal').addClass('show'); const currentZoom = map.getZoom(); map.easeTo({ zoom: currentZoom - 0.2 }); }
function hideLogoutModal() { $('#logoutModal').removeClass('show'); const currentZoom = map.getZoom(); map.easeTo({ zoom: currentZoom + 0.3 }); }
$('#logoutModal').click(function (e) { if (e.target === this) { hideLogoutModal(); } });

function confirmLogout() {
    $.ajax({ url: 'process/logout.php', type: 'POST', dataType: 'json', success: function () { window.location.href = 'login.html'; notyf.open({ type: 'success', message: 'You have been logged out.' }); }, error: function () { window.location.href = 'login.html'; } });
}

function loadUserProfile() {
    if (typeof getUserData === 'function') {
        getUserData().then(function (userData) {
            if (userData) {
                const initial = (userData.full_name || userData.username).charAt(0).toUpperCase();
                const fullName = userData.full_name || userData.username;
                const email = userData.email || '';
                const usertype = userData.usertype || 'user';

                if (userData.profile_picture && userData.profile_picture !== 'default.png' && userData.profile_picture !== '') {
                    let profilePicUrl = userData.profile_picture;

                    if (!profilePicUrl.startsWith('http://') && !profilePicUrl.startsWith('https://')) {
                        if (!profilePicUrl.startsWith('/')) {
                            if (profilePicUrl.includes('media/profile_picture/')) {
                                profilePicUrl = '/' + profilePicUrl;
                            } else {
                                profilePicUrl = 'media/profile_picture/' + profilePicUrl;
                            }
                        }
                    }

                    $('#profileTrigger').html('<img src="' + profilePicUrl + '" alt="Profile" onerror="this.src=\'media/profile_picture/default.png\'">');
                    $('#profileTrigger').css('background', 'transparent');
                    $('#dropdownAvatar').html('<img src="' + profilePicUrl + '" alt="Profile" onerror="this.src=\'media/profile_picture/default.png\'">');
                    $('#dropdownAvatar').css('background', 'transparent');
                } else {
                    $('#profileInitial').text(initial);
                    $('#dropdownInitial').text(initial);
                }

                $('#dropdownFullname').text(fullName);
                $('#dropdownEmail').text(email);
                $('#dropdownRole').text(usertype.charAt(0).toUpperCase() + usertype.slice(1));
                if (usertype === 'admin') { $('#dropdownRole').addClass('admin'); }
            }
        });
    }
}

function fetchPins() {
    $.ajax({ url: 'process/pin_handler.php', type: 'POST', dataType: 'json', data: { action: 'fetch_pins' }, success: function (response) { if (response.status === 'success') { response.pins.forEach(function (pin) { addPinToMap(pin); }); } } });
}

const statusColors = { pending: '#f59e0b', verified: '#2563eb', resolved: '#10b981', rejected: '#ef4444' };

function addPinToMap(pin) {
    if (pin.status !== 'pending' && pin.status !== 'verified') return;

    const color = statusColors[pin.status] || '#f59e0b';
    const isVerified = pin.status === 'verified';

    const el = document.createElement('div');
    el.style.cssText = `
        width: 24px;
        height: 24px;
        cursor: pointer;
    `;

    el.innerHTML = `
        <div style="
            width: 100%;
            height: 100%;
            background: ${color};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            position: relative;
        ">
            ${isVerified ? `
                <div style="
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    background: #10b981;
                    border-radius: 50%;
                    width: 10px;
                    height: 10px;
                    border: 2px solid white;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
                "></div>
            ` : ''}
        </div>
    `;

    const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center'
    }).setLngLat([pin.lng, pin.lat]).addTo(map);

    const popup = new maplibregl.Popup({
        maxWidth: '320px',
        className: 'custom-popup',
        offset: 12,
        closeOnClick: false,
        anchor: 'bottom',
        closeButton: false
    }).setHTML(buildPopupContent(pin));

    marker.setPopup(popup);

    if (!window.currentOpenPopup) window.currentOpenPopup = null;

    el.addEventListener('click', function (e) {
        e.stopPropagation();
        if (window.currentOpenPopup && window.currentOpenPopup.isOpen()) {
            window.currentOpenPopup.remove();
        }
        map.easeTo({
            center: [pin.lng, pin.lat],
            offset: [0, 150],
            duration: 600
        });
        marker.togglePopup();
        window.currentOpenPopup = popup;
    });

    popup.on('close', function () {
        if (window.currentOpenPopup === popup) {
            window.currentOpenPopup = null;
        }
    });
}

function buildPopupContent(pin) {
    const evidence = pin.evidence || [];
    const isAnonymous = pin.is_anonymous == 1;
    const userName = isAnonymous ? 'Anonymous' : (pin.full_name || pin.username);

    let userPic = 'media/profile_picture/default.png';

    const pic = (pin.profile_picture || '').trim();

    if (!isAnonymous && pic && pic.toLowerCase() !== 'default.png') {
        if (pic.startsWith('http')) {
            userPic = pic;
        } else {
            userPic = 'media/profile_picture/' + pic;
        }
    }

    const createdAt = timeAgo(pin.created_at);
    const statusLabel = pin.status.charAt(0).toUpperCase() + pin.status.slice(1);
    const statusColor = statusColors[pin.status] || '#f59e0b';

    const wazeUrl = 'https://waze.com/ul?ll=' + pin.lat + ',' + pin.lng + '&navigate=yes';
    const googleMapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + pin.lat + ',' + pin.lng;

    let evidenceHtml = '';
    if (evidence.length > 0) {
        let thumbs = '';
        const maxThumbs = 3;
        for (let i = 0; i < Math.min(evidence.length, maxThumbs); i++) {
            if (i === maxThumbs - 1 && evidence.length > maxThumbs) {
                const remaining = evidence.length - maxThumbs;
                thumbs += `
                <div class="popup-img popup-img-overlay" data-pin='${JSON.stringify(evidence)}' data-idx="${i}" onclick="openGallery(this)" style="position:relative;cursor:pointer;width:70px;height:70px;border-radius:8px;overflow:hidden;flex-shrink:0;">
                    <img src="${evidence[i]}" style="width:100%;height:100%;object-fit:cover;">
                    <div class="img-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3em;font-weight:700;border-radius:8px;">+${remaining}</div>
                </div>`;
            } else {
                thumbs += `
                <div class="popup-img" data-pin='${JSON.stringify(evidence)}' data-idx="${i}" onclick="openGallery(this)" style="cursor:pointer;width:70px;height:70px;border-radius:8px;overflow:hidden;flex-shrink:0;">
                    <img src="${evidence[i]}" style="width:100%;height:100%;object-fit:cover;">
                </div>`;
            }
        }
        evidenceHtml = `
        <div class="popup-section">
            <div class="popup-label"><i class="fas fa-camera"></i> Photos (${evidence.length})</div>
            <div class="popup-images" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">${thumbs}</div>
        </div>`;
    }

    let feedbackHtml = '';
    if (pin.feedback && pin.feedback.trim() !== '') {
        feedbackHtml = `
        <div class="popup-feedback" style="background:#f0fdf4;padding:10px;border-radius:12px;margin-top:8px;font-size:0.75rem;color:#166534;">
            <i class="fas fa-comment-dots"></i> ${pin.feedback}
        </div>`;
    }

    return `
    <div class="popup-container" style="font-family:'Inter',sans-serif;padding:16px;">
        <div class="popup-header" style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <img src="${userPic}" onerror="this.src='media/profile_picture/default.png'" style="width:40px;height:40px;border-radius:50%;object-fit:cover;background:#e2e8f0;">
            <div class="popup-user" style="flex:1;">
                <div class="popup-name" style="font-weight:700;font-size:0.7rem;color:#0f172a;">${escapeHtml(userName)}</div>
                <div class="popup-time" style="font-size:0.7rem;color:#64748b;">${createdAt}</div>
            </div>
            <div class="popup-status" style="background:${statusColor}20;color:${statusColor};padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;">${statusLabel}</div>
        </div>
        <div class="popup-section" style="margin-bottom:12px;">
            <div class="popup-label" style="font-size:0.7rem;font-weight:600;color:#64748b;margin-bottom:4px;"><i class="fas fa-map-marker-alt"></i> Address</div>
            <div class="popup-text" style="font-size:0.8rem;color:#1e293b;line-height:1.4;">${escapeHtml(pin.address)}</div>
        </div>
        <div class="popup-section" style="margin-bottom:12px;">
            <div class="popup-label" style="font-size:0.7rem;font-weight:600;color:#64748b;margin-bottom:4px;"><i class="fas fa-align-left"></i> Description</div>
            <div class="popup-text" style="font-size:0.8rem;color:#1e293b;">${escapeHtml(pin.description)}</div>
        </div>
        ${evidenceHtml}
        ${feedbackHtml}
        <div class="popup-actions" style="display:flex;gap:12px;margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;">
            <a href="${googleMapsUrl}" target="_blank" style="flex:1;text-align:center;font-size:0.75rem;color:#2563eb;text-decoration:none;"><i class="fab fa-google"></i> Maps</a>
            <a href="${wazeUrl}" target="_blank" style="flex:1;text-align:center;font-size:0.75rem;color:#2563eb;text-decoration:none;"><i class="fas fa-location-arrow"></i> Waze</a>
        </div>
    </div>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function (c) {
        return c;
    });
}


function openGallery(el) {
    const evidence = JSON.parse(el.getAttribute('data-pin'));
    let idx = parseInt(el.getAttribute('data-idx'));
    showGalleryModal(evidence, idx);
}

function showGalleryModal(images, startIdx) {
    $("#galleryModal").remove();
    let dots = '';
    for (let i = 0; i < images.length; i++) {
        dots += `<span class="gallery-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${i === startIdx ? '#fff' : 'rgba(255,255,255,0.5)'};margin:0 5px;cursor:pointer;transition:all 0.2s ease;"></span>`;
    }
    let galleryHtml = `
        <div id="galleryModal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);z-index:9999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);">
            <button class="gallery-close" style="position:absolute;top:24px;right:32px;background:transparent;border:none;font-size:2.5rem;color:#fff;z-index:2;cursor:pointer;opacity:0.8;transition:opacity 0.2s;">&times;</button>
            <button class="gallery-arrow-left" style="position:absolute;left:20px;top:50%;transform:translateY(-50%);background:transparent;border:none;font-size:3rem;color:#fff;z-index:2;cursor:pointer;opacity:0.8;transition:all 0.2s;padding:20px;text-shadow:0 2px 10px rgba(0,0,0,0.3);">&#8249;</button>
            <button class="gallery-arrow-right" style="position:absolute;right:20px;top:50%;transform:translateY(-50%);background:transparent;border:none;font-size:3rem;color:#fff;z-index:2;cursor:pointer;opacity:0.8;transition:all 0.2s;padding:20px;text-shadow:0 2px 10px rgba(0,0,0,0.3);">&#8250;</button>
            <div class="gallery-img-wrap" style="max-width:90vw;max-height:90vh;display:flex;align-items:center;justify-content:center;transition:opacity 0.3s ease;">
                <img src="${images[startIdx]}" style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5);" id="galleryMainImg">
            </div>
            <div class="gallery-dots" style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:3;">${dots}</div>
        </div>
    `;
    $("body").append(galleryHtml);

    $('.gallery-close, .gallery-arrow-left, .gallery-arrow-right').hover(
        function () { $(this).css('opacity', '1'); },
        function () { $(this).css('opacity', '0.8'); }
    );

    let currentIdx = startIdx;

    function updateGallery(idx) {
        const $img = $("#galleryMainImg");
        $img.css('opacity', '0');
        setTimeout(() => {
            $img.attr('src', images[idx]).css('opacity', '1');
        }, 150);

        $(".gallery-dot").css('background', 'rgba(255,255,255,0.5)');
        $(".gallery-dot").eq(idx).css('background', '#fff');
    }

    function closeGallery() {
        $(".gallery-img-wrap").css('opacity', '0');
        setTimeout(() => {
            $("#galleryModal").remove();
        }, 200);
        $(document).off('keydown.gallery');
    }

    $("#galleryModal .gallery-close").on('click', closeGallery);
    $("#galleryModal").on('click', function (e) { if (e.target === this) closeGallery(); });
    $("#galleryModal .gallery-arrow-left").on('click', function (e) {
        e.stopPropagation();
        currentIdx = (currentIdx - 1 + images.length) % images.length;
        updateGallery(currentIdx);
    });
    $("#galleryModal .gallery-arrow-right").on('click', function (e) {
        e.stopPropagation();
        currentIdx = (currentIdx + 1) % images.length;
        updateGallery(currentIdx);
    });

    $("#galleryModal").on('click', '.gallery-dot', function () {
        const i = $(this).index();
        currentIdx = i;
        updateGallery(currentIdx);
    });

    $(document).on('keydown.gallery', function (e) {
        if (!$('#galleryModal').length) return;
        if (e.key === 'ArrowLeft') {
            currentIdx = (currentIdx - 1 + images.length) % images.length;
            updateGallery(currentIdx);
        }
        if (e.key === 'ArrowRight') {
            currentIdx = (currentIdx + 1) % images.length;
            updateGallery(currentIdx);
        }
        if (e.key === 'Escape') closeGallery();
    });

    let touchStartX = 0;
    let touchEndX = 0;

    $("#galleryModal").on('touchstart', function (e) {
        touchStartX = e.originalEvent.changedTouches[0].screenX;
    });

    $("#galleryModal").on('touchend', function (e) {
        touchEndX = e.originalEvent.changedTouches[0].screenX;
        const swipeThreshold = 50;

        if (touchEndX < touchStartX - swipeThreshold) {
            currentIdx = (currentIdx + 1) % images.length;
            updateGallery(currentIdx);
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            currentIdx = (currentIdx - 1 + images.length) % images.length;
            updateGallery(currentIdx);
        }
    });
}

function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHr < 24) return diffHr + 'h ago';
    if (diffDay < 7) return diffDay + 'd ago';
    return past.toLocaleDateString();
}