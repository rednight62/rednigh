import React, { useEffect, useRef } from 'react';

export default function CosmicStarfield() {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let stars = Array.from({length: 220}, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2 + 0.2,
      speed: Math.random() * 0.12 + 0.02,
      alpha: Math.random() * 0.5 + 0.5
    }));
    let shooting = null;
    let shootingTimeout;

    function draw() {
      ctx.clearRect(0,0,width,height);
      // Stars
      for (let s of stars) {
        ctx.save();
        ctx.globalAlpha = s.alpha * (0.7 + 0.3*Math.sin(Date.now()/700 + s.x));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 2*Math.PI);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
        s.x += s.speed;
        if (s.x > width) s.x = 0;
      }
      // Shooting star
      if (shooting) {
        ctx.save();
        ctx.globalAlpha = shooting.alpha;
        ctx.beginPath();
        ctx.moveTo(shooting.x, shooting.y);
        ctx.lineTo(shooting.x - 80, shooting.y + 30);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2.6;
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 24;
        ctx.stroke();
        ctx.restore();
        shooting.x += shooting.vx;
        shooting.y += shooting.vy;
        shooting.alpha -= 0.018;
        if (shooting.alpha <= 0) shooting = null;
      }
      requestAnimationFrame(draw);
    }
    function triggerShootingStar() {
      shooting = {
        x: Math.random() * width * 0.7 + width * 0.2,
        y: Math.random() * height * 0.2 + 30,
        vx: -10 - Math.random()*8,
        vy: 3 + Math.random()*2,
        alpha: 1
      };
      shootingTimeout = setTimeout(triggerShootingStar, 2200 + Math.random()*2500);
    }
    draw();
    shootingTimeout = setTimeout(triggerShootingStar, 1800 + Math.random()*2000);
    window.addEventListener('resize', () => {
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width; canvas.height = height;
    });
    return () => { clearTimeout(shootingTimeout); };
  }, []);

  return <canvas id="cosmic-bg" ref={canvasRef} />;
}
