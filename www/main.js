/* =============================================================
   РОЛЕБАЗА — Клиентский JS
   ============================================================= */

/* ===== Эффект прокрутки для шапки ===== */
(function initHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        header.classList.toggle('site-header-scrolled', window.scrollY > 60);
    }, { passive: true });
})();


/* ===== Анимация появления элементов при прокрутке ===== */
(function initFadeIn() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(el);
    });
})();


/* ===== Счётчик участников листа ожидания ===== */
(function initWaitlistCounter() {
    const counterElement        = document.getElementById('member-count');
    const counterSpinnerElement = document.getElementById('member-count-spinner');

    let counterTarget      = 0;
    let counterHasValue    = false;
    let counterInView      = false;
    let counterAnimated    = false;
    let counterRetryAttempt = 0;
    let counterRetryTimer  = null;

    function parseTotal(value, fallback = null) {
        const parsed = Number.parseInt(String(value ?? ''), 10);
        return (Number.isFinite(parsed) && parsed >= 0) ? parsed : fallback;
    }

    function setCounterLoadingState(isLoading) {
        counterSpinnerElement?.classList.toggle('hidden', !isLoading);
        counterElement?.classList.toggle('hidden', isLoading);
    }

    function animateCounter() {
        if (!counterElement || !counterHasValue) return;
        setCounterLoadingState(false);

        const target   = parseTotal(counterTarget, 0);
        const duration = 2000;
        const step     = target / (duration / 16);
        let current    = 0;

        if (target <= 0) {
            counterElement.textContent = '0';
            return;
        }

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                counterElement.textContent = String(target);
                clearInterval(timer);
            } else {
                counterElement.textContent = String(Math.floor(current));
            }
        }, 16);
    }

    function scheduleCounterRetry() {
        if (counterRetryTimer) return;
        const delay = Math.min(15000, 1000 * Math.pow(2, Math.min(counterRetryAttempt, 4)));
        counterRetryAttempt += 1;
        counterRetryTimer = window.setTimeout(() => {
            counterRetryTimer = null;
            void loadWaitlistCount();
        }, delay);
    }

    async function loadWaitlistCount() {
        try {
            const response = await fetch('http://beta.rolebaza.ru/api/landing/waitlist/count', {
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const body  = await response.json();
            const total = parseTotal(body?.total, null);
            if (total === null) throw new Error('Invalid total');

            if (counterRetryTimer) {
                clearTimeout(counterRetryTimer);
                counterRetryTimer = null;
            }
            counterRetryAttempt = 0;
            counterTarget       = total;
            counterHasValue     = true;
            setCounterLoadingState(false);

            if (counterElement) {
                if (counterInView && !counterAnimated) {
                    counterAnimated = true;
                    animateCounter();
                } else {
                    counterElement.textContent = String(total);
                }
            }
        } catch {
            setCounterLoadingState(true);
            scheduleCounterRetry();
        }
    }

    // Запускаем счётчик в зоне видимости
    const counterSection = document.getElementById('waitlist');
    if (counterSection) {
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                counterInView = entry.isIntersecting;
                if (counterInView && counterHasValue && !counterAnimated) {
                    counterAnimated = true;
                    animateCounter();
                }
            });
        }, { threshold: 0.3 });
        counterObserver.observe(counterSection);
    }

    setCounterLoadingState(true);
    void loadWaitlistCount();

    // Экспортируем для формы
    window._waitlist = { loadWaitlistCount, setCounterLoadingState, parseTotal };
    window._waitlist._getCounterElement = () => counterElement;
    window._waitlist._setCounterTarget  = (v) => { counterTarget = v; counterHasValue = true; };
})();


/* ===== Форма регистрации в лист ожидания ===== */
(function initWaitlistForm() {
    const waitlistForm = document.getElementById('waitlist-form');
    if (!waitlistForm) return;

    waitlistForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const form   = e.target;
        const button = form.querySelector('button[type="submit"]');
        const status = document.getElementById('waitlist-status');
        if (!button) return;

        const originalText = button.textContent;

        if (status) {
            status.classList.add('hidden');
            status.classList.remove('text-error', 'text-success');
        }

        button.textContent = 'Записываем в летопись...';
        button.disabled    = true;

        const data    = new FormData(form);
        const payload = {
            name:    String(data.get('name')    || '').trim(),
            email:   String(data.get('email')   || '').trim(),
            role:    String(data.get('role')     || 'gm'),
            website: String(data.get('website') || ''),
            source:  window.location.href,
        };

        try {
            const response = await fetch('/api/landing/waitlist', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const body        = await response.json().catch(() => ({}));
            const serverTotal = window._waitlist?.parseTotal(body?.total, null);
            const el          = window._waitlist?._getCounterElement?.();

            if (el && serverTotal !== null) {
                window._waitlist._setCounterTarget(serverTotal);
                window._waitlist.setCounterLoadingState(false);
                el.textContent = String(serverTotal);
            } else {
                window._waitlist?.loadWaitlistCount?.();
            }

            if (status) {
                status.textContent = 'Принято! Мы записали тебя в гильдию.';
                status.classList.remove('hidden');
                status.classList.add('text-[#2f6b2f]');
            }

            form.reset();
            button.textContent = 'Вы приняты!';
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled    = false;
            }, 3000);
        } catch {
            if (status) {
                status.textContent = 'Не удалось отправить форму. Попробуйте ещё раз через минуту.';
                status.classList.remove('hidden');
                status.classList.add('text-[#8F2020]');
            }
            button.textContent = originalText;
            button.disabled    = false;
        }
    });
})();
