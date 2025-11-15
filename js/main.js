// 应用主入口
class GameApplication {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('game.html')) return 'game';
        return 'menu';
    }

    async init() {
        // 预加载音效
        await this.preloadSounds();
        
        // 应用设置
        this.applySettings();
        
        // 初始化相应页面
        if (this.currentPage === 'menu') {
            this.initMenuPage();
        } else {
            this.initGamePage();
        }

        console.log('围墙争夺战 - 游戏初始化完成');
    }

    async preloadSounds() {
        // 这里可以预加载游戏音效
        // 由于我们没有实际的音效文件，这里只是示例
        const sounds = {
            click: 'sounds/click.mp3',
            start: 'sounds/start.mp3',
            confirm: 'sounds/confirm.mp3',
            move: 'sounds/move.mp3',
            wall: 'sounds/wall.mp3',
            win: 'sounds/win.mp3'
        };

        for (const [name, url] of Object.entries(sounds)) {
            await soundManager.loadSound(name, url);
        }
    }

    applySettings() {
        // 应用主题
        document.documentElement.setAttribute('data-theme', settingsManager.settings.theme);
        
        // 应用音效设置
        soundManager.setEnabled(settingsManager.settings.soundEnabled);
    }

    initMenuPage() {
        // 菜单页面已经在menu.js中初始化
        console.log('菜单页面初始化完成');
    }

    initGamePage() {
        // 游戏页面已经在game.js中初始化
        console.log('游戏页面初始化完成');
    }

    // 全局错误处理
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            this.showError('发生了一个错误，请刷新页面重试。');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            this.showError('发生了一个错误，请刷新页面重试。');
        });
    }

    showError(message) {
        // 创建错误提示
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    new GameApplication();
});

// 导出到全局，方便调试
window.GameApp = {
    Utils,
    SettingsManager: settingsManager,
    SoundManager: soundManager
};