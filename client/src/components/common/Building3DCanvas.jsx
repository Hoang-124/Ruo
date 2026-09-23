import React, { useRef, useEffect, useState } from 'react';

/**
 * Building3DCanvas
 * High-End Architectural CAD / BIM Isometric Model of Tòa Nhà A1 (5 Floors)
 * Built with pure HTML5 Canvas and native 3D perspective projection math.
 * Zero external libraries — realistic architectural massing, facade louvers,
 * glass curtain wall, entrance canopy, and elegant CAD dimension callouts.
 */
export const Building3DCanvas = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Active or hovered floor (1 to 5, or null)
  const [activeFloor, setActiveFloor] = useState(null);
  const [isExploded, setIsExploded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;

    // 3D Camera & Rotation
    let yaw = -0.62; // Classic architectural axonometric isometric angle
    let pitch = 0.44;
    let targetYaw = -0.62;
    let targetPitch = 0.44;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Explode separation animation factor (0 = assembled building, 1 = exploded axonometric)
    let explodeProgress = 0;
    let targetExplode = 0;

    // Floor architectural metadata (Tòa Nhà A1)
    const FLOORS = [
      {
        level: 1,
        code: 'TẦNG 1',
        title: 'Sảnh Chính & Ban Quản Lý CSVC',
        meta: '22 Phòng CAD • Sảnh Đón • Phòng Kỹ Thuật'
      },
      {
        level: 2,
        code: 'TẦNG 2',
        title: 'Giảng Đường A & Học Nhóm',
        meta: '22 Phòng CAD • Hội Thảo Nhỏ • Tự Học'
      },
      {
        level: 3,
        code: 'TẦNG 3',
        title: 'Phòng Học Lý Thuyết & Đa Năng',
        meta: '22 Phòng CAD • Giảng Đường B'
      },
      {
        level: 4,
        code: 'TẦNG 4',
        title: 'Phòng Máy Tính CAD & AI/IoT',
        meta: '21 Phòng CAD • Server CSVC • Lab'
      },
      {
        level: 5,
        code: 'TẦNG 5',
        title: 'Viện Nghiên Cứu & Không Gian Mở',
        meta: '21 Phòng CAD • Studio Đồ Án • Sân Vườn'
      }
    ];

    // Handle Resize & HiDPI retina scaling
    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    // 3D Perspective Projection Function
    const project = (x, y, z) => {
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const y1 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;

      const cameraDistance = 900;
      const scale = cameraDistance / (cameraDistance + z2);

      // Centered with offset to leave room for right CAD labels
      const screenX = width * 0.44 + x1 * scale;
      const screenY = height * 0.52 + y1 * scale;

      return { x: screenX, y: screenY, z: z2, scale };
    };

    // Helper: Draw 3D Polygon Face
    const drawPolygon = (points, fillStyle, strokeStyle, lineWidth = 1) => {
      if (points.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
      if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    // Helper: Draw 3D Extruded Box
    const drawBox = (x, y, z, w, h, d, styles) => {
      const hw = w / 2;
      const hd = d / 2;

      // 8 Vertices
      const p = [
        project(x - hw, y, z - hd), // 0: Top-left-back
        project(x + hw, y, z - hd), // 1: Top-right-back
        project(x + hw, y, z + hd), // 2: Top-right-front
        project(x - hw, y, z + hd), // 3: Top-left-front
        project(x - hw, y + h, z - hd), // 4: Bot-left-back
        project(x + hw, y + h, z - hd), // 5: Bot-right-back
        project(x + hw, y + h, z + hd), // 6: Bot-right-front
        project(x - hw, y + h, z + hd) // 7: Bot-left-front
      ];

      // Top Face
      drawPolygon([p[0], p[1], p[2], p[3]], styles.topFill, styles.stroke, styles.lineWidth);
      // Front-Right Face
      drawPolygon([p[2], p[1], p[5], p[6]], styles.rightFill, styles.stroke, styles.lineWidth);
      // Front-Left Face
      drawPolygon([p[3], p[2], p[6], p[7]], styles.leftFill, styles.stroke, styles.lineWidth);

      return { topCorners: [p[0], p[1], p[2], p[3]], center: project(x, y + h / 2, z) };
    };

    // Main Render Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth camera interpolation
      if (!isDragging) {
        // Very subtle natural architectural breathing rotation
        targetYaw += 0.0012;
      }
      yaw += (targetYaw - yaw) * 0.08;
      pitch += (targetPitch - pitch) * 0.08;

      // Smooth explode transition
      targetExplode = isExploded ? 1 : 0;
      explodeProgress += (targetExplode - explodeProgress) * 0.1;

      // 1. Draw Architectural Site Ground Grid & Plaza
      const groundY = 120;
      const siteSize = 180;
      const gridCount = 6;
      const step = (siteSize * 2) / gridCount;

      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.09)';

      for (let i = -siteSize; i <= siteSize; i += step) {
        const pA = project(i, groundY, -siteSize);
        const pB = project(i, groundY, siteSize);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();

        const pC = project(-siteSize, groundY, i);
        const pD = project(siteSize, groundY, i);
        ctx.beginPath();
        ctx.moveTo(pC.x, pC.y);
        ctx.lineTo(pD.x, pD.y);
        ctx.stroke();
      }

      // Plaza Entrance Paving (in front of building)
      const plazaP = [
        project(-60, groundY - 1, 80),
        project(60, groundY - 1, 80),
        project(70, groundY - 1, 140),
        project(-70, groundY - 1, 140)
      ];
      drawPolygon(plazaP, 'rgba(30, 41, 59, 0.35)', 'rgba(59, 130, 246, 0.2)', 1);

      // 2. Render Tòa Nhà A1 (5 Floors)
      const bW = 160; // Building width
      const bD = 110; // Building depth
      const floorH = 32; // Floor wall height
      const slabH = 4; // Slab thickness
      const explodeGap = 16 * explodeProgress;

      // Render from bottom (Floor 1) to top (Floor 5)
      FLOORS.forEach((floor, idx) => {
        const isHovered = activeFloor === floor.level;
        // Cumulative height with explosion gap
        const currentY = 85 - idx * (floorH + slabH) - idx * explodeGap;

        // Color palettes based on hover & architectural materials
        const slabStyles = {
          topFill: isHovered ? 'rgba(59, 130, 246, 0.35)' : 'rgba(30, 41, 59, 0.75)',
          leftFill: isHovered ? 'rgba(37, 99, 235, 0.4)' : 'rgba(15, 23, 42, 0.85)',
          rightFill: isHovered ? 'rgba(29, 78, 216, 0.35)' : 'rgba(10, 15, 30, 0.9)',
          stroke: isHovered ? '#60A5FA' : 'rgba(96, 165, 250, 0.35)',
          lineWidth: isHovered ? 1.6 : 1
        };

        const glassStyles = {
          topFill: 'rgba(14, 165, 233, 0.12)',
          leftFill: isHovered ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.55)',
          rightFill: isHovered ? 'rgba(30, 58, 138, 0.3)' : 'rgba(10, 18, 35, 0.7)',
          stroke: isHovered ? 'rgba(147, 197, 253, 0.6)' : 'rgba(59, 130, 246, 0.25)',
          lineWidth: 0.8
        };

        // A. Draw Floor Slab (Floor Plate)
        drawBox(0, currentY + floorH, 0, bW + 8, slabH, bD + 8, slabStyles);

        // B. Draw Glass Curtain Facade Body
        drawBox(0, currentY, 0, bW, floorH, bD, glassStyles);

        // C. Draw Architectural Vertical Facade Mullions (Window Louvers)
        const mullionCountX = 6;
        const stepX = bW / mullionCountX;
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = isHovered ? 'rgba(147, 197, 253, 0.5)' : 'rgba(59, 130, 246, 0.22)';

        for (let m = 1; m < mullionCountX; m++) {
          const mx = -bW / 2 + m * stepX;
          const topFront = project(mx, currentY, bD / 2);
          const botFront = project(mx, currentY + floorH, bD / 2);
          ctx.beginPath();
          ctx.moveTo(topFront.x, topFront.y);
          ctx.lineTo(botFront.x, botFront.y);
          ctx.stroke();
        }

        const mullionCountZ = 4;
        const stepZ = bD / mullionCountZ;
        for (let m = 1; m < mullionCountZ; m++) {
          const mz = -bD / 2 + m * stepZ;
          const topSide = project(bW / 2, currentY, mz);
          const botSide = project(bW / 2, currentY + floorH, mz);
          ctx.beginPath();
          ctx.moveTo(topSide.x, topSide.y);
          ctx.lineTo(botSide.x, botSide.y);
          ctx.stroke();
        }

        // D. Entrance Canopy on Ground Floor (Tầng 1)
        if (floor.level === 1) {
          const canopyY = currentY + floorH * 0.65;
          const canopyP = [
            project(-32, canopyY, bD / 2),
            project(32, canopyY, bD / 2),
            project(36, canopyY + 2, bD / 2 + 26),
            project(-36, canopyY + 2, bD / 2 + 26)
          ];
          drawPolygon(canopyP, 'rgba(37, 99, 235, 0.55)', '#60A5FA', 1.2);

          // Canopy Support Rods
          const rodL1 = project(-30, canopyY + 2, bD / 2 + 24);
          const rodL2 = project(-30, currentY + floorH, bD / 2 + 24);
          ctx.beginPath();
          ctx.moveTo(rodL1.x, rodL1.y);
          ctx.lineTo(rodL2.x, rodL2.y);
          ctx.strokeStyle = '#60A5FA';
          ctx.lineWidth = 1;
          ctx.stroke();

          const rodR1 = project(30, canopyY + 2, bD / 2 + 24);
          const rodR2 = project(30, currentY + floorH, bD / 2 + 24);
          ctx.beginPath();
          ctx.moveTo(rodR1.x, rodR1.y);
          ctx.lineTo(rodR2.x, rodR2.y);
          ctx.stroke();
        }

        // E. Rooftop Pergola & Terrace on Top Floor (Tầng 5)
        if (floor.level === 5) {
          // Roof Ceiling Slab
          drawBox(0, currentY - slabH, 0, bW + 8, slabH, bD + 8, slabStyles);

          // Rooftop Parapet Railing
          const parapetH = 6;
          drawBox(0, currentY - slabH - parapetH, 0, bW + 8, parapetH, bD + 8, {
            topFill: 'rgba(30, 41, 59, 0.6)',
            leftFill: 'rgba(15, 23, 42, 0.8)',
            rightFill: 'rgba(10, 15, 30, 0.85)',
            stroke: 'rgba(96, 165, 250, 0.3)',
            lineWidth: 0.8
          });

          // Mechanical Penthouse & Solar Pergola Beams
          drawBox(-20, currentY - slabH - parapetH - 14, -10, 50, 14, 45, {
            topFill: 'rgba(37, 99, 235, 0.3)',
            leftFill: 'rgba(15, 23, 42, 0.9)',
            rightFill: 'rgba(10, 15, 30, 0.95)',
            stroke: 'rgba(96, 165, 250, 0.4)',
            lineWidth: 1
          });
        }

        // F. Elegant Architectural CAD Callout Line on the Right
        const rightAnchor = project(bW / 2 + 4, currentY + floorH / 2, 0);
        const calloutStartX = rightAnchor.x + 8;
        const calloutStartY = rightAnchor.y;
        const calloutEndX = width - 40;

        // Only draw callouts if canvas has enough width
        if (width > 480) {
          ctx.lineWidth = isHovered ? 1.5 : 0.8;
          ctx.strokeStyle = isHovered ? '#60A5FA' : 'rgba(148, 163, 184, 0.25)';

          // Leader line with 45-degree dogleg
          ctx.beginPath();
          ctx.moveTo(rightAnchor.x, rightAnchor.y);
          ctx.lineTo(calloutStartX, calloutStartY);
          ctx.lineTo(calloutStartX + 12, calloutStartY);
          ctx.stroke();

          // Small anchor dot
          ctx.beginPath();
          ctx.arc(rightAnchor.x, rightAnchor.y, isHovered ? 2.5 : 1.8, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? '#60A5FA' : '#94A3B8';
          ctx.fill();

          // CAD Text Label
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          // Floor Code & Title
          ctx.font = `${isHovered ? 'bold 12px' : '11.5px'} 'Be Vietnam Pro', sans-serif`;
          ctx.fillStyle = isHovered ? '#FFFFFF' : '#CBD5E1';
          ctx.fillText(`${floor.code} — ${floor.title}`, calloutStartX + 18, calloutStartY - 6);

          // Floor Subtitle Specs
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillStyle = isHovered ? '#93C5FD' : '#64748B';
          ctx.fillText(floor.meta, calloutStartX + 18, calloutStartY + 8);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Mouse Controls
    const onMouseDown = (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (isDragging) {
        const deltaX = clientX - lastMouseX;
        const deltaY = clientY - lastMouseY;
        targetYaw += deltaX * 0.007;
        targetPitch = Math.max(0.15, Math.min(0.75, targetPitch + deltaY * 0.005));
        lastMouseX = clientX;
        lastMouseY = clientY;
      } else {
        // Subtle Parallax
        const normX = (clientX - rect.left) / rect.width - 0.5;
        const normY = (clientY - rect.top) / rect.height - 0.5;
        targetYaw = -0.62 + normX * 0.35;
        targetPitch = 0.44 + normY * 0.2;

        // Hover detection on floors based on screen Y
        const relativeY = clientY - rect.top;
        const centerY = rect.height * 0.52;
        const diff = relativeY - centerY;

        if (diff > 50 && diff <= 100) setActiveFloor(1);
        else if (diff > 15 && diff <= 50) setActiveFloor(2);
        else if (diff > -25 && diff <= 15) setActiveFloor(3);
        else if (diff > -65 && diff <= -25) setActiveFloor(4);
        else if (diff > -110 && diff <= -65) setActiveFloor(5);
        else setActiveFloor(null);
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseLeave = () => {
      isDragging = false;
      setActiveFloor(null);
      targetYaw = -0.62;
      targetPitch = 0.44;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [activeFloor, isExploded]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '600px',
        overflow: 'hidden',
        background: '#040711',
        userSelect: 'none'
      }}
    >
      {/* 3D Render Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'grab'
        }}
      />

      {/* Discreet Architectural Site Tag (Bottom Left) */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'rgba(11, 15, 25, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10B981'
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#94A3B8'
            }}
          >
            TÒA NHÀ A1 • 5 TẦNG • 108 PHÒNG CAD
          </span>
        </div>

        <button
          onClick={() => setIsExploded(!isExploded)}
          style={{
            pointerEvents: 'auto',
            padding: '6px 12px',
            borderRadius: '8px',
            background: isExploded ? 'rgba(37, 99, 235, 0.25)' : 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: isExploded ? '#60A5FA' : '#94A3B8',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isExploded ? 'Thu Gọn Khối' : 'Tách Tầng (Exploded View)'}
        </button>
      </div>

      {/* Orbit Tip (Bottom Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: '26px',
          right: '32px',
          fontSize: '11px',
          color: 'rgba(148, 163, 184, 0.4)',
          fontFamily: 'JetBrains Mono, monospace',
          pointerEvents: 'none'
        }}
      >
        Kéo chuột để xoay góc nhìn 3D
      </div>
    </div>
  );
};
