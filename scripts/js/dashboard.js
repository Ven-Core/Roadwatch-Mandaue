$(document).ready(function(){
    requireAuth(); 
    loadUserProfile().then(function() {
        fetchDashboardData(); 
    });
    setupTabs(); 
    checkUrlTab();
});

const notyf = new Notyf({duration: 2500, dismissible: true, ripple: true, position: {x: 'right', y: 'bottom'}});
let statusChart, weeklyChart, allPins = [], currentEditPinData = null, currentViewImages = [];
let pinsDataTable = null;

function checkUrlTab() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if(tab === 'pins') switchTab('pins');
    else if(tab === 'settings') switchTab('settings');
}

function setupTabs() {
    $('.nav-link').click(function(){
        const tab = $(this).data('tab');
        switchTab(tab);
    });
}

function switchTab(tab) {
    $('.nav-link').removeClass('active');
    $('.nav-link[data-tab="' + tab + '"]').addClass('active');
    $('#dashboardTab, #pinsTab, #settingsTab').hide();
    const url = new URL(window.location);
    if(tab === 'dashboard') {
        url.searchParams.delete('tab');
        $('#dashboardTab').show();
    } else if(tab === 'pins') {
        url.searchParams.set('tab', 'pins');
        $('#pinsTab').show();
        renderMyPins();
    } else if(tab === 'settings') {
        url.searchParams.set('tab', 'settings');
        $('#settingsTab').show();
        loadSettingsData();
    }
    window.history.pushState({}, '', url);
}

function toggleSettingsSection(section) {
    const body = $('#' + section + 'Body');
    const header = body.prev('.settings-header');
    body.toggleClass('show');
    header.toggleClass('open');
    if(section === 'account') loadSettingsData();
}

function previewProfilePic(input) {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            $('#settingsAvatar').attr('src', e.target.result).show();
            $('#settingsAvatarFallback').hide();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function loadSettingsData() {
    getUserData().then(function(d){
        if(d) {
            $('#settingsUsername').val(d.username || '');
            $('#settingsFullname').val(d.full_name || '');
            $('#settingsEmail').val(d.email || '');
            if(d.profile_picture) {
                const pp = 'media/profile_picture/' + d.profile_picture;
                $('#settingsAvatar').attr('src', pp).show();
                $('#settingsAvatarFallback').hide();
            } else {
                const i = (d.full_name || d.username || 'U').charAt(0).toUpperCase();
                $('#settingsAvatar').hide();
                $('#settingsAvatarFallback').text(i).show();
            }
            if($('body').hasClass('dark-mode')) {
                $('#themeDark').addClass('selected');
                $('#themeLight').removeClass('selected');
            } else {
                $('#themeLight').addClass('selected');
                $('#themeDark').removeClass('selected');
            }
        }
    });
}

function setTheme(theme) {
    if(theme === 'dark') {
        $('body').addClass('dark-mode');
        $('#themeDark').addClass('selected');
        $('#themeLight').removeClass('selected');
    } else {
        $('body').removeClass('dark-mode');
        $('#themeLight').addClass('selected');
        $('#themeDark').removeClass('selected');
    }

    const isDark = theme === 'dark' ? 1 : 0;

    $.ajax({
        url: 'process/account_handler.php',
        type: 'POST',
        dataType: 'json',
        data: {
            action: 'update_theme',
            is_dark: isDark
        }
    });

    updateChartColors();
}

function updateChartColors() {
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const tooltipBg = isDark ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const borderColor = isDark ? '#1e293b' : '#ffffff';

    if (statusChart) {
        statusChart.options.plugins.legend.labels.color = textColor;
        statusChart.options.plugins.tooltip.bodyColor = textColor;
        statusChart.options.plugins.tooltip.titleColor = textColor;
        statusChart.options.plugins.tooltip.backgroundColor = tooltipBg;
        statusChart.options.plugins.tooltip.borderColor = tooltipBorder;
        statusChart.data.datasets[0].borderColor = borderColor;
        statusChart.update();
    }

    if (weeklyChart) {
        weeklyChart.options.plugins.legend.labels.color = textColor;
        weeklyChart.options.plugins.tooltip.bodyColor = textColor;
        weeklyChart.options.plugins.tooltip.titleColor = textColor;
        weeklyChart.options.plugins.tooltip.backgroundColor = tooltipBg;
        weeklyChart.options.plugins.tooltip.borderColor = tooltipBorder;
        weeklyChart.options.scales.y.ticks.color = textColor;
        weeklyChart.options.scales.x.ticks.color = textColor;
        weeklyChart.options.scales.y.grid.color = gridColor;
        weeklyChart.update();
    }
}

function saveAccountSettings() {
    const username = $('#settingsUsername').val().trim();
    const fullname = $('#settingsFullname').val().trim();
    const currentPassword = $('#settingsCurrentPassword').val();
    const password = $('#settingsPassword').val();
    if(!currentPassword) {
        notyf.open({type: 'error', message: 'Current password is required to save changes'});
        return;
    }
    const formData = new FormData();
    formData.append('action', 'update_account');
    formData.append('username', username);
    formData.append('full_name', fullname);
    formData.append('current_password', currentPassword);
    if(password) formData.append('password', password);
    const pic = $('#settingsProfilePic')[0].files[0];
    if(pic) formData.append('profile_picture', pic);
    $.ajax({url: 'process/account_handler.php', type: 'POST', data: formData, processData: false, contentType: false, dataType: 'json', success: function(r){
        if(r.status === 'success') {
            notyf.open({type: 'success', message: 'Account updated!'});
            $('#settingsCurrentPassword').val('');
            $('#settingsPassword').val('');
            loadUserProfile();
            loadSettingsData();
        } else {
            notyf.open({type: 'error', message: r.message || 'Update failed'});
        }
    }});
}

function toggleDropdown() { $('#profileDropdown').toggleClass('show'); }

$(document).click(function(e){
    if(!$(e.target).closest('.profile-container').length) { $('#profileDropdown').removeClass('show'); }
});

function showLogoutModal() { $('#profileDropdown').removeClass('show'); $('#logoutModal').addClass('show'); }
function hideLogoutModal() { $('#logoutModal').removeClass('show'); }
$('#logoutModal').click(function(e){ if(e.target === this) hideLogoutModal(); });

function confirmLogout() {
    $.ajax({url: 'process/logout.php', type: 'POST', dataType: 'json', success: function(response){
        if(response.status === 'success') window.location.href = 'login.html';
    }, error: function(){ window.location.href = 'login.html'; }});
}

function loadUserProfile() {
    return getUserData().then(function(d){
        if(d) {
            const i = (d.full_name || d.username).charAt(0).toUpperCase();
            const fn = d.full_name || d.username;
            if(d.is_dark == 1) {
                $('body').addClass('dark-mode');
            } else {
                $('body').removeClass('dark-mode');
            }
            if(d.profile_picture && d.profile_picture !== 'default.png' && d.profile_picture !== '') {
                const pp = 'media/profile_picture/' + d.profile_picture;
                $('#headerAvatar').html('<img src="' + pp + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<span>' + i + '</span>\';">');
                $('#headerAvatar').css('background', 'transparent');
            } else {
                $('#headerInitial').text(i);
            }
            $('#headerFullname').text(fn);
        }
    });
}

function fetchUserPins() {
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: 'process/pin_handler.php', 
            type: 'POST', 
            dataType: 'json', 
            data: {action: 'fetch_user_pins'},
            success: function(r){
                if(r.status === 'success' && r.pins) {
                    resolve(r.pins);
                } else {
                    resolve([]);
                }
            },
            error: function() {
                reject([]);
            }
        });
    });
}

function fetchDashboardData() {
    fetchUserPins().then(function(pins) {
        if(pins && pins.length > 0) {
            allPins = pins;
            const pending = pins.filter(function(p){ return p.status === 'pending'; });
            const verified = pins.filter(function(p){ return p.status === 'verified'; });
            const resolved = pins.filter(function(p){ return p.status === 'resolved'; });
            const rejected = pins.filter(function(p){ return p.status === 'rejected'; });
            
            $('#statTotal').text(pins.length);
            $('#statPending').text(pending.length);
            $('#statVerified').text(verified.length);
            $('#statResolved').text(resolved.length);
            $('#recentCount').text(pins.length + ' pins');
            
            renderStatusChart(pending.length, verified.length, resolved.length, rejected.length);
            renderWeeklyChart(pins);
            
            const recent = pins.slice(0, 8);
            if(recent.length > 0) {
                let html = '';
                recent.forEach(function(p){
                    const sc = p.status;
                    const sl = p.status.charAt(0).toUpperCase() + p.status.slice(1);
                    const ta = getTimeAgo(p.created_at);
                    html += '<div class="pin-item" onclick="openActionModal(' + p.id + ')" style="cursor:pointer;"><div class="pin-status-dot ' + sc + '"></div><div class="pin-info"><div class="pin-address">' + escapeHtml(p.address) + '</div><div class="pin-desc">' + escapeHtml(p.description) + '</div><div class="pin-time">' + ta + '</div></div><span class="pin-status-badge ' + sc + '">' + sl + '</span></div>';
                });
                $('#pinsList').html(html);
            } else {
                $('#pinsList').html('<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><p>No reports yet</p></div>');
            }
        } else {
            allPins = [];
            $('#statTotal').text('0');
            $('#statPending').text('0');
            $('#statVerified').text('0');
            $('#statResolved').text('0');
            $('#recentCount').text('0 pins');
            $('#pinsList').html('<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><p>No reports yet</p></div>');
            renderStatusChart(0, 0, 0, 0);
            renderWeeklyChart([]);
        }
    }).catch(function() {
        notyf.open({type: 'error', message: 'Failed to load dashboard data'});
    });
}

function renderMyPins() {
    fetchUserPins().then(function(userPins) {
        if(!userPins || userPins.length === 0) {
            const tbody = $('#myPinsTableBody');
            tbody.html('<tr><td colspan="4" class="empty-state">No reports found</td></tr>');
            $('#myPinsCount').text('0 pins');
            if(pinsDataTable) {
                pinsDataTable.destroy();
                pinsDataTable = null;
            }
            return;
        }
        
        let html = '';
        userPins.forEach(function(pin){
            const statusText = pin.status.charAt(0).toUpperCase() + pin.status.slice(1);
            const createdAt = new Date(pin.created_at).toLocaleDateString();
            html += `<tr onclick="openActionModal(${pin.id})" style="cursor:pointer;">
                <td>${escapeHtml(pin.address)}</td>
                <td>${escapeHtml(pin.description)}</td>
                <td><span class="status-badge ${pin.status}">${statusText}</span></td>
                <td>${createdAt}</td>
            </tr>`;
        });
        
        const tbody = $('#myPinsTableBody');
        tbody.html(html);
        $('#myPinsCount').text(userPins.length + ' pins');
        
        if(pinsDataTable) {
            pinsDataTable.destroy();
            pinsDataTable = null;
        }
        
        pinsDataTable = $('#myPinsTable').DataTable({
            paging: false,
            searching: false,
            ordering: true,
            info: false,
            responsive: true,
            columnDefs: [{ orderable: true, targets: [0,1,2,3] }]
        });
    }).catch(function() {
        notyf.open({type: 'error', message: 'Failed to load your pins'});
    });
}

function openActionModal(pinId) {
    const content = `<div class="action-modal-content"><div class="action-modal-title">Choose Action</div><div class="action-buttons"><button class="action-button view" onclick="closeModals(); viewPin(${pinId})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View</button><button class="action-button edit" onclick="closeModals(); editPin(${pinId})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>Edit</button><button class="action-button delete" onclick="closeModals(); deletePin(${pinId})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>Delete</button></div></div>`;
    $('#actionDialog').html(content);
    $('#actionModal').addClass('show');
    $('#actionModal').off('click').on('click', function(e){ if(e.target === this) closeModals(); });
}

function viewPin(pinId) {
    fetchUserPins().then(function(userPins) {
        const pin = userPins.find(function(item){ return item.id == pinId; });
        if(!pin) return;
        currentViewImages = pin.evidence || [];
        const statusText = pin.status.charAt(0).toUpperCase() + pin.status.slice(1);
        const createdAt = new Date(pin.created_at).toLocaleString();
        let evidenceHtml = '';
        if(currentViewImages.length) {
            evidenceHtml += '<div class="view-evidence-grid">';
            currentViewImages.forEach(function(src, idx){
                evidenceHtml += `<button type="button" class="view-evidence-thumb" onclick="event.stopPropagation(); openImageGallery(currentViewImages, ${idx})"><img src="${src}" alt="Evidence ${idx+1}"></button>`;
            });
            evidenceHtml += '</div>';
        } else {
            evidenceHtml = '<div class="empty-state" style="padding:20px 0;"><p>No photos available</p></div>';
        }
        const isDark = $('body').hasClass('dark-mode');
        const textColor = isDark ? '#f1f5f9' : '#0f172a';
        const content = `<div><div class="modal-title">Report Details</div><div class="view-meta"><div class="meta-item"><strong>Status:</strong> <span class="status-badge ${pin.status}">${statusText}</span></div><div class="meta-item"><strong>Submitted:</strong> ${createdAt}</div><div class="meta-item"><strong>Reporter:</strong> ${escapeHtml(pin.full_name || pin.username)}</div></div><div class="modal-body-row"><div class="modal-small-title">Location</div><div style="color:${textColor};">${escapeHtml(pin.address)}</div></div><div class="modal-body-row"><div class="modal-small-title">Description</div><div style="color:${textColor};">${escapeHtml(pin.description)}</div></div>${evidenceHtml}<div class="modal-button-row"><button class="btn-cancel" onclick="closeModals()">Close</button></div></div>`;
        $('#viewDialog').html(content);
        $('#viewModal').addClass('show');
        $('#viewModal').off('click').on('click', function(e){ if(e.target === this) closeModals(); });
    });
}

function editPin(pinId) {
    fetchUserPins().then(function(userPins) {
        const pin = userPins.find(function(item){ return item.id == pinId; });
        if(!pin) return;
        const evidenceObjects = (pin.evidence || []).map(function(src){ return {src: src, isNew: false}; });
        currentEditPinData = {...pin, evidence: evidenceObjects, originalEvidence: evidenceObjects.map(function(item){ return item.src; })};
        renderEditModal();
    });
}

function closeModals() { $('#viewModal, #editModal, #actionModal').removeClass('show'); closeImageGallery(); }

let currentGalleryImages = [];
let currentGalleryIndex = 0;

function openImageGallery(images, startIndex) {
    currentGalleryImages = images;
    currentGalleryIndex = startIndex;
    updateGallery();
    $('#imageGallery').fadeIn(200);
    $(document).on('keydown.gallery', function(e){
        if(e.key === 'ArrowLeft') navigateGallery(-1);
        else if(e.key === 'ArrowRight') navigateGallery(1);
        else if(e.key === 'Escape') closeImageGallery();
    });
}

function closeImageGallery() { 
    $('#imageGallery').fadeOut(200); 
    $(document).off('keydown.gallery');
}

function navigateGallery(direction) {
    currentGalleryIndex += direction;
    if(currentGalleryIndex < 0) currentGalleryIndex = currentGalleryImages.length - 1;
    if(currentGalleryIndex >= currentGalleryImages.length) currentGalleryIndex = 0;
    updateGallery();
}

function updateGallery() {
    $('#galleryImage').attr('src', currentGalleryImages[currentGalleryIndex]);
    let indicators = '';
    for(let i = 0; i < currentGalleryImages.length; i++) {
        indicators += `<div onclick="setGalleryIndex(${i})" style="width:8px;height:8px;border-radius:50%;background:${i === currentGalleryIndex ? 'white' : 'rgba(255,255,255,0.5)'};cursor:pointer;transition:all 0.2s;"></div>`;
    }
    $('#galleryIndicators').html(indicators);
}

function setGalleryIndex(index) { currentGalleryIndex = index; updateGallery(); }

function renderEditModal() {
    const pin = currentEditPinData;
    if(!pin) return;
    let evidenceHtml = '<div class="edit-evidence-grid">';
    if(pin.evidence && pin.evidence.length) {
        pin.evidence.forEach(function(item, idx){
            evidenceHtml += `<div style="position:relative; display:inline-block; margin:5px;"><img src="${item.src}" alt="Evidence" style="width:90px;height:90px;object-fit:cover;border-radius:12px;border:1.5px solid var(--border);"><button type="button" onclick="event.stopPropagation(); removeEvidenceFromEdit(${idx})" style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:#dc2626;color:white;border:none;cursor:pointer;font-size:14px;font-weight:bold;display:flex;align-items:center;justify-content:center;">×</button></div>`;
        });
    }
    evidenceHtml += `<button type="button" class="add-image-btn" onclick="event.stopPropagation(); $('#editEvidenceInput').click()"><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><span>Add photo</span></button></div><input type="file" id="editEvidenceInput" accept="image/jpeg,image/png,image/webp" style="display:none;" multiple onchange="handleEditImages(this)">`;
    const content = `<div><div class="modal-title">Edit Report</div><div class="modal-body-row"><div class="modal-small-title">Address</div><input id="editAddress" class="modal-field" type="text" value="${escapeHtml(pin.address)}"></div><div class="modal-body-row"><div class="modal-small-title">Description</div><textarea id="editDesc" class="modal-field" rows="4">${escapeHtml(pin.description)}</textarea></div><div class="modal-body-row"><div class="modal-small-title">Evidence</div><div style="font-size:0.75rem;color:#64748b;">Maximum 5 images, 5MB each.</div>${evidenceHtml}</div><div class="modal-button-row"><button class="btn-cancel" onclick="closeModals()">Cancel</button><button class="btn-save" style="background:#2563eb;" onclick="saveEditPinFull()">Save Changes</button></div></div>`;
    $('#editDialog').html(content);
    $('#editModal').addClass('show');
    $('#editModal').off('click').on('click', function(e){ if(e.target === this) closeModals(); });
}

function removeEvidenceFromEdit(idx){ if(currentEditPinData && currentEditPinData.evidence){ currentEditPinData.evidence.splice(idx,1); renderEditModal(); } }

function handleEditImages(input){
    if(!input.files.length || !currentEditPinData) return;
    const files = Array.from(input.files);
    const existingCount = currentEditPinData.evidence ? currentEditPinData.evidence.length : 0;
    if(existingCount + files.length > 5){ notyf.open({type:'error', message:'Maximum 5 photos total'}); input.value = ''; return; }
    const accepted = [];
    for(const file of files){
        const ext = file.name.split('.').pop().toLowerCase();
        if(!['jpg','jpeg','png','webp'].includes(ext)){ notyf.open({type:'error', message:file.name+' is not a supported image type'}); continue; }
        if(file.size > 5 * 1024 * 1024){ notyf.open({type:'error', message:file.name+' exceeds 5MB'}); continue; }
        accepted.push(file);
    }
    if(!accepted.length){ input.value = ''; return; }
    accepted.forEach(function(file){ currentEditPinData.evidence.push({src: URL.createObjectURL(file), isNew: true, file: file}); });
    renderEditModal();
    notyf.open({type:'success', message:'Photo(s) added'});
    input.value = '';
}

function saveEditPinFull(){
    if(!currentEditPinData) return;
    const address = $('#editAddress').val().trim();
    const description = $('#editDesc').val().trim();
    if(!address || !description){ notyf.open({type:'error', message:'Address and description are required'}); return; }
    const existingPaths = currentEditPinData.evidence.filter(function(item){ return !item.isNew; }).map(function(item){ return item.src; });
    const newFiles = currentEditPinData.evidence.filter(function(item){ return item.isNew; }).map(function(item){ return item.file; });
    if(existingPaths.length + newFiles.length > 5){ notyf.open({type:'error', message:'Maximum 5 photos allowed'}); return; }
    const removedFiles = (currentEditPinData.originalEvidence || []).filter(function(src){ return existingPaths.indexOf(src) === -1; });
    const formData = new FormData();
    formData.append('action', 'update_pin');
    formData.append('pin_id', currentEditPinData.id);
    formData.append('address', address);
    formData.append('description', description);
    formData.append('evidence_json', JSON.stringify(existingPaths));
    if(removedFiles.length) formData.append('removed_evidence', JSON.stringify(removedFiles));
    newFiles.forEach(function(file){ formData.append('evidence[]', file); });
    $.ajax({url: 'process/pin_handler.php', type: 'POST', dataType: 'json', data: formData, processData: false, contentType: false, success: function(r){
        if(r.status === 'success'){
            notyf.open({type:'success', message:r.message || 'Report updated'});
            closeModals();
            fetchDashboardData();
            if($('.nav-link.active').data('tab') === 'pins') renderMyPins();
        } else {
            notyf.open({type:'error', message:r.message || 'Update failed'});
        }
    }, error: function(){ notyf.open({type:'error', message:'Server error'}); }});
}

function deletePin(pinId){
    const content = `<div><div class="modal-title" style="color:#dc2626;">Delete Report</div><div class="modal-text">This action cannot be undone. Are you sure you want to delete this report?</div><div class="modal-button-row"><button class="btn-cancel" onclick="closeModals()">Cancel</button><button class="btn-logout" onclick="confirmDeletePin(${pinId})">Delete</button></div></div>`;
    $('#editDialog').html(content);
    $('#editModal').addClass('show');
    $('#editModal').off('click').on('click', function(e){ if(e.target === this) closeModals(); });
}

function confirmDeletePin(pinId){
    $.ajax({url: 'process/pin_handler.php', type: 'POST', dataType: 'json', data: {action: 'delete_pin', pin_id: pinId}, success: function(r){
        if(r.status === 'success'){
            notyf.open({type:'success', message:r.message || 'Report deleted'});
            closeModals();
            fetchDashboardData();
            if($('.nav-link.active').data('tab') === 'pins') renderMyPins();
        } else {
            notyf.open({type:'error', message:r.message || 'Delete failed'});
        }
    }, error: function(){ notyf.open({type:'error', message:'Server error'}); }});
}

function renderStatusChart(pending, verified, resolved, rejected) {
    const ctx = document.getElementById('statusChart').getContext('2d');

    if (statusChart) statusChart.destroy();

    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#ffffff' : '#000000';
    const tooltipBg = isDark ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const borderColor = isDark ? '#1e293b' : '#ffffff';

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Verified', 'Resolved', 'Rejected'],
            datasets: [{
                data: [pending, verified, resolved, rejected],
                backgroundColor: ['#f59e0b', '#2563eb', '#10b981', '#ef4444'],
                borderColor: borderColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: {
                            family: 'Inter',
                            size: 10
                        },
                        color: textColor
                    }
                },
                tooltip: {
                    bodyColor: textColor,
                    titleColor: textColor,
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1
                }
            }
        }
    });
}

function renderWeeklyChart(pins) {
    const ctx = document.getElementById('weeklyChart').getContext('2d');

    if (weeklyChart) weeklyChart.destroy();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();

    const pendingC = [0,0,0,0,0,0,0];
    const verifiedC = [0,0,0,0,0,0,0];
    const resolvedC = [0,0,0,0,0,0,0];
    const rejectedC = [0,0,0,0,0,0,0];

    pins.forEach(function(p){
        const d = new Date(p.created_at);
        const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));

        if(diff < 7){
            const idx = d.getDay();

            if(p.status === 'pending') pendingC[idx]++;
            else if(p.status === 'verified') verifiedC[idx]++;
            else if(p.status === 'resolved') resolvedC[idx]++;
            else if(p.status === 'rejected') rejectedC[idx]++;
        }
    });

    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const tooltipBg = isDark ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Pending',
                    data: pendingC,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#f59e0b'
                },
                {
                    label: 'Verified',
                    data: verifiedC,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#2563eb'
                },
                {
                    label: 'Resolved',
                    data: resolvedC,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#10b981'
                },
                {
                    label: 'Rejected',
                    data: rejectedC,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 14,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                        boxWidth: 8,
                        font: {
                            family: 'Inter',
                            size: 9
                        },
                        color: textColor
                    }
                },
                tooltip: {
                    bodyColor: textColor,
                    titleColor: textColor,
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: textColor,
                        font: {
                            family: 'Inter',
                            size: 9
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Inter',
                            size: 9
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

function escapeHtml(str) { return String(str || '').replace(/[&<>"']/g, function(m){ if(m === '&') return '&amp;'; if(m === '<') return '&lt;'; if(m === '>') return '&gt;'; if(m === '"') return '&quot;'; if(m === "'") return '&#39;'; return m; }); }

function getTimeAgo(d) {
    const n = new Date();
    const p = new Date(d);
    const s = Math.floor((n - p) / 1000);
    if(s < 60) return 'Just now';
    if(s < 3600) return Math.floor(s / 60) + 'm ago';
    if(s < 86400) return Math.floor(s / 3600) + 'h ago';
    if(s < 604800) return Math.floor(s / 86400) + 'd ago';
    return p.toLocaleDateString();
}