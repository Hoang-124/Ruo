/**
 * Native Zero-Dependency Confetti Burst (Ponytail Principle: No external npm packages)
 */
export const triggerConfetti = () => {
  const colors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];
  const particleCount = 40;

  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.zIndex = '99999';
    el.style.width = `${Math.random() * 8 + 6}px`;
    el.style.height = `${Math.random() * 12 + 6}px`;
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.top = '50%';
    el.style.left = '50%';
    el.style.borderRadius = '2px';
    el.style.pointerEvents = 'none';
    el.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`;
    el.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
    el.style.opacity = '1';

    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 250 + 80;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance;

    requestAnimationFrame(() => {
      el.style.transform = `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) rotate(${Math.random() * 720}deg)`;
      el.style.opacity = '0';
    });

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1000);
  }
};
