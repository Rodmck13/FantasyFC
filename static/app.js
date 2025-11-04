class AuthApp {
    constructor() {
        this.apiBase = 'http://localhost:5000/api';
        this.token = localStorage.getItem('authToken');
        this.currentUser = null;

        this.initializeEventListeners();
        this.checkAuthStatus();
    }

    initializeEventListeners() {
        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Navigation
        document.getElementById('showRegister').addEventListener('click', (e) => this.showRegister(e));
        document.getElementById('showLogin').addEventListener('click', (e) => this.showLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    }

    async checkAuthStatus() {
        if (this.token) {
            try {
                const user = await this.apiCall('/profile');
                this.currentUser = user.user;
                this.showAuthenticatedView();
            } catch (error) {
                console.error('Auth check failed:', error);
                this.clearAuth();
                this.showLoginView();
            }
        } else {
            this.showLoginView();
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await this.apiCall('/login', 'POST', { email, password });
            this.token = response.token;
            this.currentUser = response.user;

            localStorage.setItem('authToken', this.token);
            this.showAuthenticatedView();
            this.showMessage('Login successful!', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            await this.apiCall('/register', 'POST', { name, email, password });
            this.showMessage('Registration successful! Please login.', 'success');
            this.showLoginView();
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    handleLogout() {
        this.clearAuth();
        this.showLoginView();
        this.showMessage('Logged out successfully!', 'success');
    }

    clearAuth() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
    }

    showLoginView() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('registerSection').style.display = 'none';
        document.getElementById('lobbySection').style.display = 'none';
        document.getElementById('adminSection').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('userWelcome').textContent = '';
    }

    showRegisterView() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('registerSection').style.display = 'block';
        document.getElementById('lobbySection').style.display = 'none';
        document.getElementById('adminSection').style.display = 'none';
    }

    showAuthenticatedView() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('registerSection').style.display = 'none';
        document.getElementById('lobbySection').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('userWelcome').textContent = `Welcome, ${this.currentUser.name}!`;

        // Display user profile and load all users
        this.displayUserProfile();
        this.loadAllUsers();
        // Load matchday data
        this.loadMatchdayData();
    }

    async loadMatchdayData() {
        try {
            const response = await this.apiCall('/matchday');
            if (response.matchday) {
                this.displayMatchdayBanner(response.matchday);
            } else {
                console.warn('No matchday data received');
                this.hideMatchdayBanner();
            }
        } catch (error) {
            console.error('Failed to load matchday data:', error);
            this.hideMatchdayBanner();
        }
    }

    // Add this method to display the matchday banner
    displayMatchdayBanner(matchdayData) {
        // Update matchday number
        document.getElementById('matchdayNumber').textContent = `Matchday ${matchdayData.number}`;

        // Update accumulated amount
        document.getElementById('accumulatedBadge').textContent = matchdayData.accumulated;

        // Update top player
        document.getElementById('topPlayer').textContent = matchdayData.topPlayer;

        // Update bottom players
        document.getElementById('lastPlayer').textContent = matchdayData.lastPlayer;
        document.getElementById('secondToLast').textContent = matchdayData.secondToLast;

        // Update no subs player
        document.getElementById('noSubsPlayer').textContent = matchdayData.noSubs;
    }

    // Optional: Method to hide the banner if data fails to load
    hideMatchdayBanner() {
        const matchdaySection = document.querySelector('.matchday-banner-section');
        if (matchdaySection) {
            matchdaySection.style.display = 'none';
        }
    }

    async displayUserProfile() {
        try {
            const profile = await this.apiCall('/profile');

            // Update profile banner
            const bannerName = document.getElementById('bannerName');
            const bannerPosition = document.getElementById('bannerPosition');
            const bannerTeamName = document.getElementById('bannerTeamName');
            const teamIcon = document.getElementById('teamIcon');
            const bannerAvatar = document.getElementById('bannerAvatar');

            // Set basic info
            bannerName.textContent = profile.user.name;

            if (profile.user.preferences) {
                bannerPosition.textContent = profile.user.preferences.position || 'Not set';
                bannerTeamName.textContent = profile.user.preferences.favorite_team || 'Not set';

                // Set team icon
                if (profile.user.preferences.favorite_team) {
                    teamIcon.innerHTML = this.getTeamIcon(profile.user.preferences.favorite_team);
                }

                // Set avatar
                if (profile.user.preferences.picture && profile.user.preferences.picture.trim() !== '') {
                    bannerAvatar.src = profile.user.preferences.picture;
                } else {
                    bannerAvatar.src = this.generateAvatarSVG(profile.user.name[0].toUpperCase());
                }
            } else {
                bannerPosition.textContent = 'Not set';
                bannerTeamName.textContent = 'Not set';
                bannerAvatar.src = this.generateAvatarSVG(profile.user.name[0].toUpperCase());
            }

        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    // Add team icon mapping method
    getTeamIcon(teamName) {
        const teamIcons = {
            'Ajax': '⚽',
            'Arsenal': '🔴',
            'Atalanta': '🔵',
            'Athletic Club': '🔴',
            'AtlÃ©tico de Madrid': '🔴⚪',
            'B. Dortmund': '🟡',
            'Barcelona': '🔵🔴',
            'Bayern MÃ¼nchen': '🔴',
            'Benfica': '🔴',
            'BodÃ¸/Glimt': '🟡',
            'Chelsea': '🔵',
            'Club Brugge': '🔵',
            'Copenhagen': '⚪',
            'Frankfurt': '🔴',
            'Galatasaray': '🟡🔴',
            'Inter': '🔵⚫',
            'Juventus': '⚫⚪',
            'Kairat Almaty': '🟡',
            'Leverkusen': '🔴',
            'Liverpool': '🔴',
            'Man City': '🔵',
            'Marseille': '🔵',
            'Monaco': '🔴',
            'Napoli': '🔵',
            'Newcastle': '⚫⚪',
            'Olympiacos': '🔴',
            'Pafos': '🔵',
            'Paris Saint-Germain': '🔵',
            'PSV': '🔴⚪',
            'QarabaÄŸ': '🔵',
            'Real Madrid': '⚪',
            'Slavia Praha': '🔴',
            'Sporting CP': '🟢',
            'Tottenham': '⚪',
            'Union SG': '🔵',
            'Villarreal': '🟡'
        };

        return teamIcons[teamName] || '🏆';
    }
    async loadAllUsers() {
        try {
            const response = await this.apiCall('/users');
            this.displayUserCards(response.users);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    async loadUserSkillsAndCreateChart(userId) {
        try {
            console.log(`Loading chart for user ${userId}`);

            // Check if container exists first
            const container = document.getElementById(`chart-${userId}`);
            if (!container) {
                console.error(`Chart container chart-${userId} not found!`);
                return;
            }
            console.log(`Found container for user ${userId}`);

            const response = await this.apiCall(`/ratings/${userId}`);
            console.log(`Ratings response for user ${userId}:`, response);

            if (response.skills && response.skills.length > 0 && response.ratings.length > 0) {
                console.log(`Creating hexagon chart for user ${userId}`);
                // Calculate average for each skill
                const skillAverages = this.calculateSkillAverages(response.ratings, response.skills.length);
                this.createHexagonChart(userId, response.skills, skillAverages);
            } else {
                console.log(`Creating empty chart for user ${userId}`);
                // Show empty chart if no ratings
                this.createEmptyHexagonChart(userId, response.skills || []);
            }
        } catch (error) {
            console.error(`Failed to load skills for chart user ${userId}:`, error);
            this.createEmptyHexagonChart(userId, []);
        }
    }

    calculateSkillAverages(ratings, skillCount) {
        const skillSums = Array(skillCount).fill(0);
        const skillCounts = Array(skillCount).fill(0);

        ratings.forEach(rating => {
            for (let i = 1; i <= skillCount; i++) {
                const skillValue = rating[`skill_${i}`];
                if (skillValue !== undefined) {
                    skillSums[i - 1] += skillValue;
                    skillCounts[i - 1]++;
                }
            }
        });

        return skillSums.map((sum, index) =>
            skillCounts[index] > 0 ? Math.round(sum / skillCounts[index]) : 0
        );
    }

    createHexagonChart(userId, skills, skillAverages) {
        console.log(`Creating hexagon chart for user ${userId}`, { skills, skillAverages });

        const container = document.getElementById(`chart-${userId}`);
        if (!container) {
            console.error(`Container chart-${userId} not found for createHexagonChart`);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.className = 'hexagon-chart';
        canvas.width = 180;
        canvas.height = 180;

        container.innerHTML = '';
        container.appendChild(canvas);

        // Define colors based on average rating
        const avgRating = skillAverages.reduce((a, b) => a + b, 0) / skillAverages.length;
        let borderColor, backgroundColor, pointBackgroundColor;

        if (avgRating >= 80) {
            borderColor = 'rgba(46, 204, 113, 0.8)'; // Green for high ratings
            backgroundColor = 'rgba(46, 204, 113, 0.2)';
            pointBackgroundColor = 'rgba(46, 204, 113, 1)';
        } else if (avgRating >= 60) {
            borderColor = 'rgba(52, 152, 219, 0.8)'; // Blue for medium-high ratings
            backgroundColor = 'rgba(52, 152, 219, 0.2)';
            pointBackgroundColor = 'rgba(52, 152, 219, 1)';
        } else if (avgRating >= 40) {
            borderColor = 'rgba(243, 156, 18, 0.8)'; // Orange for medium ratings
            backgroundColor = 'rgba(243, 156, 18, 0.2)';
            pointBackgroundColor = 'rgba(243, 156, 18, 1)';
        } else {
            borderColor = 'rgba(231, 76, 60, 0.8)'; // Red for low ratings
            backgroundColor = 'rgba(231, 76, 60, 0.2)';
            pointBackgroundColor = 'rgba(231, 76, 60, 1)';
        }

        const ctx = canvas.getContext('2d');

        try {
            // Create the radar chart
            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: skills,
                    datasets: [{
                        label: 'Skills',
                        data: skillAverages,
                        borderColor: borderColor,
                        backgroundColor: backgroundColor,
                        pointBackgroundColor: pointBackgroundColor,
                        pointBorderColor: '#ffffff',
                        pointHoverBackgroundColor: '#ffffff',
                        pointHoverBorderColor: borderColor,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: {
                                color: 'rgba(255, 255, 255, 0.1)',
                                lineWidth: 1
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)',
                                circular: true
                            },
                            pointLabels: {
                                color: '#ffd700',
                                font: {
                                    size: 10,
                                    weight: 'bold'
                                },
                                padding: 15
                            },
                            ticks: {
                                display: false,
                                backdropColor: 'transparent',
                                color: 'rgba(255, 255, 255, 0.5)',
                                stepSize: 20,
                                max: 100,
                                min: 0
                            },
                            suggestedMin: 0,
                            suggestedMax: 100
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return `${context.label}: ${context.raw}`;
                                }
                            },
                            backgroundColor: 'rgba(10, 31, 58, 0.9)',
                            titleColor: '#ffd700',
                            bodyColor: '#ffffff',
                            borderColor: '#ffd700',
                            borderWidth: 1
                        }
                    },
                    elements: {
                        line: {
                            tension: 0.1
                        }
                    }
                }
            });
            console.log(`Hexagon chart created successfully for user ${userId}`);
        } catch (chartError) {
            console.error(`Error creating chart for user ${userId}:`, chartError);
        }
    }

    createEmptyHexagonChart(userId, skills) {
        const canvas = document.createElement('canvas');
        canvas.className = 'hexagon-chart';
        canvas.width = 180;
        canvas.height = 180;

        const container = document.getElementById(`chart-${userId}`);
        container.innerHTML = '';
        container.appendChild(canvas);

        const emptyData = skills.map(() => 0);

        const ctx = canvas.getContext('2d');

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: skills,
                datasets: [{
                    label: 'No Ratings Yet',
                    data: emptyData,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    pointBackgroundColor: 'rgba(255, 255, 255, 0.5)',
                    pointBorderColor: '#ffffff',
                    pointRadius: 3,
                    borderWidth: 1,
                    fill: true
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            lineWidth: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            circular: true
                        },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            font: {
                                size: 10
                            },
                            padding: 15
                        },
                        ticks: {
                            display: false,
                            max: 100,
                            min: 0
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });

        // Add "No ratings" text
        const noRatingsText = document.createElement('div');
        noRatingsText.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        text-align: center;
        pointer-events: none;
    `;
        noRatingsText.textContent = 'No ratings\n yet';
        container.appendChild(noRatingsText);
    }

    showRegister(e) {
        e.preventDefault();
        this.showRegisterView();
    }

    showLogin(e) {
        e.preventDefault();
        this.showLoginView();
    }

    async loadAdminSection() {
        // This would typically check user role/permissions
        try {
            const users = await this.apiCall('/users', 'GET');
            this.displayUsers(users.users);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    displayUsers(users) {
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>Email: ${user.email}</p>
                    <small>Created: ${new Date(user.created_at).toLocaleDateString()}</small>
                </div>
                <div class="user-actions">
                    <button class="btn btn-danger" onclick="app.deleteUser(${user.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await this.apiCall(`/users/${userId}`, 'DELETE');
                this.showMessage('User deleted successfully!', 'success');
                this.loadAdminSection(); // Refresh the list
            } catch (error) {
                this.showMessage(error.message, 'error');
            }
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        // Add Authorization header for authenticated requests
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data) {
            config.body = JSON.stringify(data);
        }

        console.log(`Making ${method} request to ${this.apiBase}${endpoint}`, config);

        const response = await fetch(`${this.apiBase}${endpoint}`, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Something went wrong');
        }

        return result;
    }


    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        document.querySelector('.main-content').prepend(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    async checkAuthStatus() {
        if (this.token) {
            try {
                const user = await this.apiCall('/profile');
                this.currentUser = user.user;
                this.showAuthenticatedView();

                // Check if preferences are complete
                await this.checkPreferences();
            } catch (error) {
                console.error('Auth check failed:', error);
                this.clearAuth();
                this.showLoginView();
            }
        } else {
            this.showLoginView();
        }
    }

    async checkPreferences() {
        try {
            const response = await this.apiCall('/preferences/check');
            if (!response.preferences_complete) {
                this.showPreferencesModal();
            }
        } catch (error) {
            console.error('Failed to check preferences:', error);
        }
    }

    showPreferencesModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
    <div class="modal-content">
        <h2>Complete Your Profile</h2>
        <p>Please fill in your preferences to enhance your experience.</p>
        <form id="preferencesForm" class="preferences-form">
            <div class="form-group">
                <label for="position">Preferred Football Position:</label>
                <select id="position" required>
                    <option value="">Select Position</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Defender">Defender</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Forward">Forward</option>
                </select>
            </div>
            <div class="form-group">
                <label for="favoriteTeam">Favorite Team:</label>
                <select id="favoriteTeam" required>
                    <option value="">Select Team</option>
                    <option value="Ajax">Ajax</option>
                    <option value="Arsenal">Arsenal</option>
                    <option value="Atalanta">Atalanta</option>
                    <option value="Athletic Club">Athletic Club</option>
                    <option value="Atlético de Madrid">Atlético de Madrid</option>
                    <option value="B. Dortmund">B. Dortmund</option>
                    <option value="Barcelona">Barcelona</option>
                    <option value="Bayern München">Bayern München</option>
                    <option value="Benfica">Benfica</option>
                    <option value="Bodø/Glimt">Bodø/Glimt</option>
                    <option value="Chelsea">Chelsea</option>
                    <option value="Club Brugge">Club Brugge</option>
                    <option value="Copenhagen">Copenhagen</option>
                    <option value="Frankfurt">Frankfurt</option>
                    <option value="Galatasaray">Galatasaray</option>
                    <option value="Inter">Inter</option>
                    <option value="Juventus">Juventus</option>
                    <option value="Kairat Almaty">Kairat Almaty</option>
                    <option value="Leverkusen">Leverkusen</option>
                    <option value="Liverpool">Liverpool</option>
                    <option value="Man City">Man City</option>
                    <option value="Marseille">Marseille</option>
                    <option value="Monaco">Monaco</option>
                    <option value="Napoli">Napoli</option>
                    <option value="Newcastle">Newcastle</option>
                    <option value="Olympiacos">Olympiacos</option>
                    <option value="Pafos">Pafos</option>
                    <option value="Paris Saint-Germain">Paris Saint-Germain</option>
                    <option value="PSV">PSV</option>
                    <option value="Qarabağ">Qarabağ</option>
                    <option value="Real Madrid">Real Madrid</option>
                    <option value="Slavia Praha">Slavia Praha</option>
                    <option value="Sporting CP">Sporting CP</option>
                    <option value="Tottenham">Tottenham</option>
                    <option value="Union SG">Union SG</option>
                    <option value="Villarreal">Villarreal</option>
                </select>
            </div>
            <div class="form-group">
                <label>Profile Picture:</label>
                <div class="file-upload">
                    <input type="file" id="pictureUpload" class="file-upload-input" accept="image/*">
                    <label for="pictureUpload" class="file-upload-label" id="fileUploadLabel">
                        <i class="upload-icon">📁</i> Choose a profile picture...
                    </label>
                </div>
                <div class="file-preview" id="filePreview" style="display: none;">
                    <img id="imagePreview" src="" alt="Preview">
                    <p id="fileName"></p>
                </div>
            </div>
            <div class="form-group">
                <label for="slogan">Your Slogan:</label>
                <textarea id="slogan" placeholder="Enter a catchy slogan..." maxlength="100"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" id="skipPreferences" class="btn btn-secondary">Skip for Now</button>
                <button type="submit" class="btn btn-primary">Save Preferences</button>
            </div>
        </form>
    </div>
    `;

        document.body.appendChild(modal);

        // Event listeners for the modal
        document.getElementById('preferencesForm').addEventListener('submit', (e) => this.savePreferences(e));
        document.getElementById('skipPreferences').addEventListener('click', () => this.closeModal(modal));

        // File upload event listener
        document.getElementById('pictureUpload').addEventListener('change', (e) => this.handleFileUpload(e));
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('filePreview');
        const imagePreview = document.getElementById('imagePreview');
        const fileName = document.getElementById('fileName');
        const fileUploadLabel = document.getElementById('fileUploadLabel');

        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showMessage('Please select an image file.', 'error');
                event.target.value = '';
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showMessage('Image size should be less than 5MB.', 'error');
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.src = e.target.result;
                fileName.textContent = file.name;
                preview.style.display = 'block';
                fileUploadLabel.textContent = 'Change Picture';
                fileUploadLabel.classList.add('has-file');
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'none';
            fileUploadLabel.textContent = 'Choose a profile picture...';
            fileUploadLabel.classList.remove('has-file');
        }
    }

    async savePreferences(e) {
        e.preventDefault();
        console.log("savePreferences!!");

        const pictureUpload = document.getElementById('pictureUpload');
        let pictureDataUrl = '';

        // Handle file upload
        if (pictureUpload.files[0]) {
            pictureDataUrl = await this.convertFileToDataURL(pictureUpload.files[0]);
        }

        const preferences = {
            position: document.getElementById('position').value,
            favorite_team: document.getElementById('favoriteTeam').value,
            picture: pictureDataUrl, // Now storing as Data URL
            slogan: document.getElementById('slogan').value
        };

        console.log("Preferences to save:", preferences);

        try {
            const response = await this.apiCall('/preferences', 'POST', preferences);
            console.log("Backend response:", response);

            this.showMessage(response.message, 'success');
            this.closeModal(document.querySelector('.modal-overlay'));

            await this.displayUserProfile();
            await this.loadAllUsers();

        } catch (error) {
            console.error("Error saving preferences:", error);
            this.showMessage(error.message, 'error');
        }
    }

    convertFileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                resolve(e.target.result);
            };
            reader.onerror = function (e) {
                reject(new Error('Failed to read file'));
            };
            reader.readAsDataURL(file);
        });
    }

    closeModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    showRatingModal(user) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
        <div class="modal-content">
            <h2>Rate ${user.name}</h2>
            <p>Rate ${user.name}'s skills as a ${user.position}</p>
            <form id="ratingForm" class="rating-form">
                <div id="skillsContainer">
                    <!-- Skills will be populated dynamically -->
                </div>
                <div class="rating-summary">
                    <h3>Overall Score: <span id="overallScore">0</span></h3>
                </div>
                <div class="form-actions">
                    <button type="button" id="cancelRating" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Submit Rating</button>
                </div>
            </form>
        </div>
    `;

        document.body.appendChild(modal);

        // Load skills and existing rating
        this.loadRatingSkills(user.id, modal);

        // Event listeners
        document.getElementById('ratingForm').addEventListener('submit', (e) => this.submitRating(e, user.id));
        document.getElementById('cancelRating').addEventListener('click', () => this.closeModal(modal));
    }

    async loadRatingSkills(userId, modal) {
        try {
            console.log(`Loading rating skills for user ${userId}`);

            const response = await this.apiCall(`/ratings/${userId}/my-rating`);
            console.log('My rating response:', response);

            const skillsResponse = await this.apiCall(`/ratings/${userId}`);
            console.log('All ratings response:', skillsResponse);

            const skillsNames = response.rating ? response.rating.skill_names : (response.skill_names || []);
            console.log('Skill names: ', skillsNames);

            const skillsContainer = modal.querySelector('#skillsContainer');
            console.log('Skills container found:', !!skillsContainer);

            if (skillsNames && skillsNames.length > 0) {
                console.log('Skill names found:', skillsNames);

                // Calculate current averages for reference
                let currentAverages = [];
                if (skillsResponse.ratings && skillsResponse.ratings.length > 0) {
                    console.log('Ratings found, calculating averages');
                    currentAverages = this.calculateSkillAverages(skillsResponse.ratings, skillsNames.length);
                } else {
                    console.log('No ratings found for this user');
                }

                const skillsHTML = skillsNames.map((skill, index) => {
                    const currentAvg = currentAverages[index] || 0;
                    const currentRating = response.rating ? response.rating[`skill_${index + 1}`] : 50;
                    console.log(`Skill ${index + 1}: ${skill}, Avg: ${currentAvg}, Current: ${currentRating}`);

                    return `
                <div class="skill-rating">
                    <label for="skill_${index + 1}">
                        ${skill}:
                        <span class="current-average">(Avg: ${currentAvg})</span>
                    </label>
                    <div class="skill-controls">
                        <input type="range" id="skill_${index + 1}" name="skill_${index + 1}" 
                               min="0" max="100" value="${currentRating}" 
                               class="skill-slider">
                        <span class="skill-value">${currentRating}</span>
                    </div>
                </div>
                `;
                }).join('');

                console.log('Setting skills container HTML');
                skillsContainer.innerHTML = skillsHTML;

                // Add event listeners to sliders
                skillsNames.forEach((_, index) => {
                    const slider = modal.querySelector(`#skill_${index + 1}`);
                    const valueSpan = modal.querySelector(`#skill_${index + 1}`).nextElementSibling;

                    if (slider && valueSpan) {
                        slider.addEventListener('input', (e) => {
                            valueSpan.textContent = e.target.value;
                            this.updateOverallScore(modal);
                        });
                        console.log(`Added event listener for skill_${index + 1}`);
                    } else {
                        console.error(`Could not find slider or value span for skill_${index + 1}`);
                    }
                });

                this.updateOverallScore(modal);
            } else {
                console.error('No skill_names in response:', response);
                skillsContainer.innerHTML = '<p>No skills available for this position.</p>';
            }
        } catch (error) {
            console.error('Failed to load rating skills:', error);
            const skillsContainer = modal.querySelector('#skillsContainer');
            skillsContainer.innerHTML = `<p>Error loading skills: ${error.message}</p>`;
        }
    }

    updateOverallScore(modal) {
        const sliders = modal.querySelectorAll('.skill-slider');
        let total = 0;

        sliders.forEach(slider => {
            total += parseInt(slider.value);
        });

        const average = Math.round(total / sliders.length);
        modal.querySelector('#overallScore').textContent = average;
    }

    async submitRating(e, userId) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const ratingData = {};

        // Collect all skill values
        for (let i = 1; i <= 6; i++) {
            const skillValue = document.getElementById(`skill_${i}`).value;
            ratingData[`skill_${i}`] = parseInt(skillValue);
        }

        try {
            const response = await this.apiCall(`/ratings/${userId}`, 'POST', ratingData);
            this.showMessage(response.message, 'success');
            this.closeModal(document.querySelector('.modal-overlay'));

            // Refresh user cards to show updated ratings
            await this.loadAllUsers();

        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    displayUserCards(users) {
        const usersGrid = document.getElementById('usersGrid');

        usersGrid.innerHTML = users.map(user => {
            // Use the first letter of the name as avatar
            const userInitial = user.name ? user.name[0].toUpperCase() : 'U';
            const defaultAvatar = this.generateAvatarSVG(userInitial);

            let imageUrl = user.picture && user.picture.trim() !== '' ? user.picture : defaultAvatar;

            return `
        <div class="player-card" data-team="${user.favorite_team}">
            <div class="card-header">
                <div class="player-image">
                    <img src="${imageUrl}" alt="${user.name}" 
                         onerror="this.src='${defaultAvatar}'">
                </div>
                <div class="player-basic-info">
                    <h3 class="player-name">${user.name}</h3>
                    <div class="player-position">${user.position}</div>
                    <div class="player-team">${user.favorite_team}</div>
                </div>
            </div>
            <div class="card-body">
                <div class="player-slogan">
                    "${user.slogan}"
                </div>
                <div class="player-rating">
                    <div class="rating-stars">
                        <span class="rating-label">Overall Rating:</span>
                        <span class="rating-value">${user.average_rating}</span>
                        <span class="rating-count">(${user.rating_count} ratings)</span>
                    </div>
                </div>
                <!-- ADD THIS CONTAINER FOR THE HEXAGON CHART -->
                <div class="hexagon-chart-container" id="chart-${user.id}">
                    <!-- Hexagon chart will be rendered here -->
                </div>
                <div class="player-stats">
                    <div class="stat">
                        <span class="stat-label">Joined</span>
                        <span class="stat-value">${new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div class="player-actions">
                    <button class="btn btn-primary rate-btn" onclick="app.showRatingModal(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                        Rate Player
                    </button>
                </div>
            </div>
        </div>
        `;
        }).join('');

        // Load skills and create charts for each user
        users.forEach(user => {
            this.loadUserSkillsAndCreateChart(user.id);
        });
    }

    // Helper method for SVG avatars
    generateAvatarSVG(initial, size = 150) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect width="${size}" height="${size}" fill="#0a1f3a"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
              font-family="Arial" font-size="${size * 0.4}" fill="#ffd700">${initial}</text>
    </svg>`;
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }
}

// Initialize the application
const app = new AuthApp();