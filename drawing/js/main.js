const REV = 6,
    BRUSHES = ["simple", "web", "sketchy", "shaded", "chrome", "fur", "longfur", "squares", "ribbon", "circles", "grid"],
    USER_AGENT = navigator.userAgent.toLowerCase();

var SCREEN_WIDTH = window.innerWidth,
    SCREEN_HEIGHT = window.innerHeight,
    BRUSH_SIZE = 1,
    BRUSH_PRESSURE = 1,
    COLOR = [0, 0, 0],
    BACKGROUND_COLOR = [250, 250, 250],
    brush,
    saveTimeOut,
    wacom,
    i,
    mouseX = 0,
    mouseY = 0,
    foregroundColorSelector,
    menu,
    canvas,
    context,
    isFgColorSelectorVisible = false,
    isMenuMouseOver = false,
    shiftKeyIsDown = false,
    brushSizeTouchStart = 1,
    brushSizeTouchReference = 0.0;

init();

function init() {
    var palette, embed;

    if (USER_AGENT.search("android") > -1 || USER_AGENT.search("iphone") > -1)
        BRUSH_SIZE = 2;

    canvas = document.getElementById("cv");
    canvas.width = $('#dcv').width();
    canvas.height = $('#dcv').height();
    canvas.style.cursor = 'crosshair';

    palette = new Palette();

    foregroundColorSelector = new ColorSelector(palette);
    foregroundColorSelector.addEventListener('change', onForegroundColorSelectorChange, false);
    
    context = canvas.getContext("2d");

    menu = new Menu();

    menu.foregroundColor.addEventListener('click', onMenuForegroundColor, false);
    menu.selector.addEventListener('change', onMenuSelectorChange, false);
    foregroundColorSelector.setColor(COLOR);

    brush = eval("new " + BRUSHES[0] + "(context)");

    window.addEventListener('mousemove', onWindowMouseMove, false);
    window.addEventListener('resize', onWindowResize, false);

    canvas.addEventListener('mousedown', onCanvasMouseDown, false);
    canvas.addEventListener('touchstart', onCanvasTouchStart, false);
}


// WINDOW
function onWindowResize() {
    var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = $('#dcv').width();
    canvas.height = $('#dcv').height();
    context.putImageData(imgData, 0, 0);
}

function onWindowMouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
}

// DOCUMENT

function isEventInColorSelector(cx, cy) {
    if (!isFgColorSelectorVisible) {
        return false;
    }

    var xLoc = 0,
        yLoc = 0;

    if (isFgColorSelectorVisible) {
        xLoc = foregroundColorSelector.container.offsetLeft + 250;
        yLoc = foregroundColorSelector.container.offsetTop;
    } else {}

    xLoc = cx - xLoc;
    yLoc = cy - yLoc;

    return (xLoc >= 0 && xLoc <= 150 &&
        yLoc >= 0 && yLoc <= 250);
}

// COLOR SELECTORS

function onForegroundColorSelectorChange(event) {
    COLOR = foregroundColorSelector.getColor();

    menu.setForegroundColor(COLOR);
}

// MENU

function onMenuForegroundColor() {
    cleanPopUps();

    foregroundColorSelector.container.style.left = (($('#dcv').width() - foregroundColorSelector.container.offsetWidth) / 2) + 'px';
    foregroundColorSelector.container.style.top = (($('#dcv').height() - foregroundColorSelector.container.offsetHeight) / 4) + 'px';
    foregroundColorSelector.show();

    isFgColorSelectorVisible = true;
}

function onMenuSelectorChange() {
    if (BRUSHES[menu.selector.selectedIndex] == "")
        return;

    brush.destroy();
    brush = eval("new " + BRUSHES[menu.selector.selectedIndex] + "(context)");
}

// CANVAS

function onCanvasMouseDown(event) {
    var data, position;

    clearTimeout(saveTimeOut);
    cleanPopUps();

    BRUSH_PRESSURE = wacom && wacom.isWacom ? wacom.pressure : 1;

    brush.strokeStart(event.offsetX, event.offsetY);
    canvas.addEventListener('mousemove', onCanvasMouseMove, false);
    canvas.addEventListener('mouseup', onCanvasMouseUp, false);
}

function onCanvasMouseMove(event) {
    BRUSH_PRESSURE = wacom && wacom.isWacom ? wacom.pressure : 1;
    brush.stroke(event.offsetX, event.offsetY);
}

function onCanvasMouseUp() {
    brush.strokeEnd();

    canvas.removeEventListener('mousemove', onCanvasMouseMove, false);
    canvas.removeEventListener('mouseup', onCanvasMouseUp, false);
}

//

function showFGColorPickerAtLocation(loc) {
    foregroundColorSelector.show();
    foregroundColorSelector.container.style.left = (loc[0] - (foregroundColorSelector.container.offsetWidth / 2)) + 'px';
    foregroundColorSelector.container.style.top = (loc[1] - (foregroundColorSelector.container.offsetHeight / 2)) + 'px';

    isFgColorSelectorVisible = true;
}

function averageTouchPositions(touches) {
    var touchLength = touches.length;
    var average = [0, 0];

    for (var i = 0; i < event.touches.length; ++i) {
        var touch = event.touches[i];
        average[0] += touch.pageX;
        average[1] += touch.pageY;
    }
    average[0] = average[0] / touches.length;
    average[1] = average[1] / touches.length;

    return average;
}

function distance(a, b) {
    var dx = a.pageX - b.pageX;
    var dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
}

function onCanvasTouchStart(event) {
    clearTimeout(saveTimeOut);
    cleanPopUps();

    if (event.touches.length == 1) {
        // draw
        event.preventDefault();

        brush.strokeStart(event.touches[0].pageX - canvas.offsetLeft, event.touches[0].pageY - canvas.offsetTop);

        window.addEventListener('touchmove', onCanvasTouchMove, false);
        window.addEventListener('touchend', onCanvasTouchEnd, false);
    } else if (event.touches.length == 2) {
        // brush size
        event.preventDefault();

        brushSizeTouchReference = distance(event.touches[0], event.touches[1]);
        brushSizeTouchStart = BRUSH_SIZE;

        window.addEventListener('touchmove', onBrushSizeTouchMove, false);
        window.addEventListener('touchend', onBrushSizeTouchEnd, false);
    } else if (event.touches.length == 3) {
        // foreground color
        event.preventDefault();

        var loc = averageTouchPositions(event.touches);
        showFGColorPickerAtLocation(loc);

        window.addEventListener('touchmove', onFGColorPickerTouchMove, false);
        window.addEventListener('touchend', onFGColorPickerTouchEnd, false);
    } else if (event.touches.length == 4) {
        // reset brush
        event.preventDefault();
        window.addEventListener('touchend', onResetBrushTouchEnd, false);
    }
}

function onCanvasTouchMove(event) {
    if (event.touches.length == 1) {
        event.preventDefault();
        brush.stroke(event.touches[0].pageX - canvas.offsetLeft, event.touches[0].pageY - canvas.offsetTop);
    }
}

function onCanvasTouchEnd(event) {
    if (event.touches.length == 0) {
        event.preventDefault();

        brush.strokeEnd();

        window.removeEventListener('touchmove', onCanvasTouchMove, false);
        window.removeEventListener('touchend', onCanvasTouchEnd, false);
    }
}

function rebuildBrush() {
    brush.destroy();
    brush = eval("new " + BRUSHES[menu.selector.selectedIndex] + "(context)");
}

function onResetBrushTouchEnd(event) {
    if (event.touches.length == 0) {
        event.preventDefault();
        rebuildBrush();
        window.removeEventListener('touchend', onResetBrushTouchEnd, false);
    }
}

function onFGColorPickerTouchMove(event) {
    if (event.touches.length == 3) {
        event.preventDefault();
        var loc = averageTouchPositions(event.touches);
        foregroundColorSelector.container.style.left = (loc[0] - (foregroundColorSelector.container.offsetWidth / 2)) + 'px';
        foregroundColorSelector.container.style.top = (loc[1] - (foregroundColorSelector.container.offsetHeight / 2)) + 'px';
    }
}

function onFGColorPickerTouchEnd(event) {
    if (event.touches.length == 0) {
        event.preventDefault();

        window.removeEventListener('touchmove', onFGColorPickerTouchMove, false);
        window.removeEventListener('touchend', onFGColorPickerTouchEnd, false);
    }
}

function onBrushSizeTouchMove(event) {
    if (event.touches.length == 2) {
        event.preventDefault();

        var size = brushSizeTouchStart + (distance(event.touches[0], event.touches[1]) - brushSizeTouchReference) / 4;
        BRUSH_SIZE = Math.max(Math.min(Math.floor(size), 320), 1);
    }
}

function onBrushSizeTouchEnd(event) {
    if (event.touches.length == 0) {
        event.preventDefault();

        window.removeEventListener('touchmove', onBrushSizeTouchMove, false);
        window.removeEventListener('touchend', onBrushSizeTouchEnd, false);
    }
}

function cleanPopUps() {
    if (isFgColorSelectorVisible) {
        foregroundColorSelector.hide();
        isFgColorSelectorVisible = false;
    }
}