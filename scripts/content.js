(function() {
    if (window.__presentationCanvasInjected) return;
    window.__presentationCanvasInjected = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const offScreen = document.createElement('canvas');
    const offCtx = offScreen.getContext('2d');

    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '9999999';
    canvas.style.pointerEvents = 'none';
    canvas.style.touchAction = 'none';
    document.documentElement.appendChild(canvas);

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

        if (offScreen.width !== docWidth || offScreen.height !== docHeight) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = offScreen.width;
            tempCanvas.height = offScreen.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(offScreen, 0, 0);

            offScreen.width = docWidth;
            offScreen.height = docHeight;
            offCtx.drawImage(tempCanvas, 0, 0);
        }
    }
    resize();
    window.addEventListener('resize', resize);

    let tool = 'laser';
    let color = '#ff0000';
    let size = 5;
    let isDrawing = false;
    let startPos = { x: 0, y: 0 };
    let currentPos = { x: 0, y: 0 };
    let currentPoints = [];
    let laserPos = null;
    let lastErasePoint = null;

    window.addEventListener('pointermove', (e) => {
        laserPos = { x: e.clientX, y: e.clientY };
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'update_tool') {
            tool = msg.tool;
            color = msg.color;
            size = msg.size;
            canvas.style.pointerEvents = (tool === 'laser') ? 'none' : 'auto';
        } else if (msg.action === 'clear') {
            offCtx.clearRect(0, 0, offScreen.width, offScreen.height);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else if (msg.action === 'destroy') {
            canvas.remove();
            delete window.__presentationCanvasInjected;
        }
    });

    canvas.addEventListener('pointerdown', (e) => {
        if (tool === 'laser') return;

        if (e.pointerId !== undefined) {
            canvas.setPointerCapture(e.pointerId);
        }

        isDrawing = true;
        const pagePt = { x: e.pageX, y: e.pageY };
        startPos = pagePt;
        currentPos = pagePt;
        currentPoints = [pagePt];

        if (tool === 'eraser') {
            lastErasePoint = pagePt;
            applyEraserSegment(offCtx, pagePt, pagePt, size * 2);
        }
    });

    window.addEventListener('pointermove', (e) => {
        if (!isDrawing) return;
        const pagePt = { x: e.pageX, y: e.pageY };
        currentPos = pagePt;

        if (tool === 'pen') {
            currentPoints.push(pagePt);
        } else if (tool === 'eraser') {
            applyEraserSegment(offCtx, lastErasePoint, pagePt, size * 2);
            lastErasePoint = pagePt;
        }
    });

    const stopDrawing = (e) => {
        if (!isDrawing) return;
        isDrawing = false;

        if (e && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
        }

        if (tool === 'pen') {
            drawShape(offCtx, { type: 'pen', points: currentPoints, color, size });
        } else if (tool === 'eraser') {
            lastErasePoint = null;
        } else if (tool !== 'laser') {
            drawShape(offCtx, { type: tool, start: startPos, end: currentPos, color, size });
        }
        currentPoints = [];
    };

    window.addEventListener('pointerup', stopDrawing);
    window.addEventListener('pointercancel', stopDrawing);

    function applyEraserSegment(context, p1, p2, eraserSize) {
        if (!p1 || !p2) return;
        context.save();
        context.globalCompositeOperation = 'destination-out';
        context.lineWidth = eraserSize;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(p1.x, p1.y);
        context.lineTo(p2.x, p2.y);
        context.stroke();
        context.restore();
    }

    function drawShape(targetCtx, shape) {
        targetCtx.strokeStyle = shape.color;
        targetCtx.fillStyle = shape.color;
        targetCtx.lineWidth = shape.size;
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';

        if (shape.type === 'pen') {
            if (shape.points.length < 2) return;
            targetCtx.beginPath();
            targetCtx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                targetCtx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            targetCtx.stroke();
        } else if (shape.type === 'line') {
            targetCtx.beginPath();
            targetCtx.moveTo(shape.start.x, shape.start.y);
            targetCtx.lineTo(shape.end.x, shape.end.y);
            targetCtx.stroke();
        } else if (shape.type === 'rect') {
            targetCtx.beginPath();
            targetCtx.strokeRect(
                shape.start.x,
                shape.start.y,
                shape.end.x - shape.start.x,
                shape.end.y - shape.start.y
            );
        } else if (shape.type === 'circle') {
            const rx = (shape.end.x - shape.start.x) / 2;
            const ry = (shape.end.y - shape.start.y) / 2;
            const cx = shape.start.x + rx;
            const cy = shape.start.y + ry;

            targetCtx.beginPath();
            targetCtx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
            targetCtx.stroke();
        } else if (shape.type === 'arrow') {
            const headLength = Math.max(12, shape.size * 2.5);
            const angle = Math.atan2(shape.end.y - shape.start.y, shape.end.x - shape.start.x);

            targetCtx.beginPath();
            targetCtx.moveTo(shape.start.x, shape.start.y);
            targetCtx.lineTo(shape.end.x, shape.end.y);
            targetCtx.stroke();

            targetCtx.beginPath();
            targetCtx.moveTo(shape.end.x, shape.end.y);
            targetCtx.lineTo(
                shape.end.x - headLength * Math.cos(angle - Math.PI / 6),
                             shape.end.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            targetCtx.lineTo(
                shape.end.x - headLength * Math.cos(angle + Math.PI / 6),
                             shape.end.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            targetCtx.closePath();
            targetCtx.fill();
        }
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(
            offScreen,
            window.scrollX, window.scrollY,
            canvas.width, canvas.height,
            0, 0,
            canvas.width, canvas.height
        );

        if (isDrawing && tool !== 'eraser') {
            ctx.save();
            ctx.translate(-window.scrollX, -window.scrollY);
            if (tool === 'pen') {
                drawShape(ctx, { type: 'pen', points: currentPoints, color, size });
            } else {
                drawShape(ctx, { type: tool, start: startPos, end: currentPos, color, size });
            }
            ctx.restore();
        }

        if (tool === 'eraser' && laserPos) {
            ctx.beginPath();
            ctx.arc(laserPos.x, laserPos.y, size, 0, Math.PI * 2);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        if (tool === 'laser' && laserPos) {
            ctx.beginPath();
            ctx.arc(laserPos.x, laserPos.y, size * 1.5 + 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        requestAnimationFrame(render);
    }

    render();
})();
