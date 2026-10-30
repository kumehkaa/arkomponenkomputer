(function () {
    const root = document.documentElement;
    const storageKey = 'site-theme';
    let savedTheme = null;

    try {
        savedTheme = localStorage.getItem(storageKey);
    } catch (error) {
        console.error('Tema pilihan tidak dapat dibaca dari penyimpanan browser.', error);
    }

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', savedTheme === 'dark' || (!savedTheme && prefersDark));

    function setupThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        const icon = document.getElementById('theme-toggle-icon');
        if (!toggle || !icon) {
            return;
        }

        function updateToggle() {
            const isDark = root.classList.contains('dark');
            icon.classList.toggle('fa-moon', !isDark);
            icon.classList.toggle('fa-sun', isDark);
            toggle.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
            toggle.title = isDark ? 'Mode terang' : 'Mode gelap';
            toggle.setAttribute('aria-pressed', String(isDark));
        }

        toggle.addEventListener('click', function () {
            const isDark = root.classList.toggle('dark');
            try {
                localStorage.setItem(storageKey, isDark ? 'dark' : 'light');
            } catch (error) {
                console.error('Tema pilihan tidak dapat disimpan di browser.', error);
            }
            updateToggle();
        });

        updateToggle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupThemeToggle);
    } else {
        setupThemeToggle();
    }
})();
