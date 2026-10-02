let activeScrollFrame = 0;

export function scrollToSection(id: string) {
  const target = document.getElementById(id);

  if (!target) {
    return false;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  const start = window.scrollY;
  const destination = Math.min(
    Math.max(
      0,
      start + target.getBoundingClientRect().top - 72,
    ),
    document.documentElement.scrollHeight - window.innerHeight,
  );

  if (Math.abs(destination - start) < 1) {
    return false;
  }

  if (activeScrollFrame) {
    window.cancelAnimationFrame(activeScrollFrame);
  }

  const startedAt = performance.now();
  const duration = 1100;

  if (window.location.hash !== `#${id}`) {
    window.history.pushState(null, "", `#${id}`);
  }

  function animateScroll(now: number) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const easedProgress = 1 - (1 - progress) ** 4;

    window.scrollTo(
      0,
      start + (destination - start) * easedProgress,
    );

    if (progress < 1) {
      activeScrollFrame = window.requestAnimationFrame(animateScroll);
    } else {
      activeScrollFrame = 0;
    }
  }

  activeScrollFrame = window.requestAnimationFrame(animateScroll);
  return true;
}
