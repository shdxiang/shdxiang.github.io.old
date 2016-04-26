const REV = 6,
    BRUSHES = ["simple", "web", "sketchy", "shaded", "chrome", "fur", "longfur", "squares", "circles"],
    BRUSHE_NAMES = ["铅笔", "网状", "速写", "阴影", "铬状", "短毛", "长毛", "矩形", "圆形"],
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

var topic = 'drawing',
    yunba,
    brush_name,
    brush_stroke = [],
    cid;

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
    brush_name = BRUSHES[0];

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
    brush_name = BRUSHES[menu.selector.selectedIndex];
}

// CANVAS

function onCanvasMouseDown(event) {
    var data, position;

    clearTimeout(saveTimeOut);
    cleanPopUps();

    BRUSH_PRESSURE = wacom && wacom.isWacom ? wacom.pressure : 1;

    brush.strokeStart(event.offsetX, event.offsetY);
    push_stroke(event.offsetX, event.offsetY);

    canvas.addEventListener('mousemove', onCanvasMouseMove, false);
    canvas.addEventListener('mouseup', onCanvasMouseUp, false);
}

function onCanvasMouseMove(event) {
    BRUSH_PRESSURE = wacom && wacom.isWacom ? wacom.pressure : 1;
    brush.stroke(event.offsetX, event.offsetY);
    push_stroke(event.offsetX, event.offsetY);
}

function onCanvasMouseUp() {
    brush.strokeEnd();
    publish_draw();

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
        average[0] += touch.clientX;
        average[1] += touch.clientY;
    }
    average[0] = average[0] / touches.length;
    average[1] = average[1] / touches.length;

    return average;
}

function distance(a, b) {
    var dx = a.clientX - b.clientX;
    var dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function onCanvasTouchStart(event) {
    clearTimeout(saveTimeOut);
    cleanPopUps();

    if (event.touches.length == 1) {
        // draw
        event.preventDefault();

        var x, y;
        x = event.touches[0].clientX - $('#cv').offset().left;
        y = event.touches[0].clientY - $('#cv').offset().top;
        brush.strokeStart(x, y);
        push_stroke(x, y);

        window.addEventListener('touchmove', onCanvasTouchMove, false);
        window.addEventListener('touchend', onCanvasTouchEnd, false);
    } else if (event.touches.length == 2) {
        // foreground color
        event.preventDefault();

        var loc = averageTouchPositions(event.touches);
        showFGColorPickerAtLocation(loc);

        window.addEventListener('touchmove', onFGColorPickerTouchMove, false);
        window.addEventListener('touchend', onFGColorPickerTouchEnd, false);
    }
}

function onCanvasTouchMove(event) {
    if (event.touches.length == 1) {
        event.preventDefault();

        var x, y;
        x = event.touches[0].clientX - $('#cv').offset().left;
        y = event.touches[0].clientY - $('#cv').offset().top;
        brush.stroke(x, y);
        push_stroke(x, y);
    }
}

function onCanvasTouchEnd(event) {
    if (event.touches.length == 0) {
        event.preventDefault();

        brush.strokeEnd();
        publish_draw();

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

function init_yunba() {
    yunba = new Yunba({
        server: 'sock.yunba.io',
        port: 3000,
        appkey: '5697113d4407a3cd028abead'
    });

    yunba.init(function(success) {
        if (success) {
            cid = Math.random().toString().substr(2);
            console.log('cid: ' + cid);
            yunba.connect_by_customid(cid,
                function(success, msg, sessionid) {
                    if (success) {
                        console.log('sessionid：' + sessionid);
                        yunba.subscribe({
                                'topic': topic
                            },
                            function(success, msg) {
                                if (success) {
                                    console.log('subscribed');
                                    yunba.set_message_cb(function(data) {
                                        process_data(data);
                                    });
                                } else {
                                    console.log(msg);
                                }
                            }
                        );
                    } else {
                        console.log(msg);
                    }
                });
        }
    });
}

function process_data(data) {
    console.log(data);
    var draw = JSON.parse(data.msg);
    if (draw.cid == cid) {
        return;
    }

    var orig_color = COLOR;
    foregroundColorSelector.setColor(draw.color);
    brs = eval("new " + draw.name + "(context)");
    brs.strokeStart(draw.stroke[0][0], draw.stroke[0][1]);

    for (var i = 1; i < draw.stroke.length; i++) {
        brs.stroke(draw.stroke[i][0], draw.stroke[i][1]);
    }
    brs.strokeEnd();

    COLOR = orig_color;
    foregroundColorSelector.setColor(COLOR);
    brs.destroy();
}

function publish_draw() {
    var draw = {
        cid: cid,
        name: brush_name,
        color: COLOR,
        stroke: brush_stroke
    }
    // console.log(JSON.stringify(stroke))
    yunba.publish({
            topic: topic,
            msg: JSON.stringify(draw)
        },
        function(success, msg) {
            if (!success) {
                console.log(msg);
            }
        }
    );
    brush_stroke = [];
}

function push_stroke(x, y) {
    brush_stroke.push([Math.round(x), Math.round(y)]);
}

init_yunba();
init();