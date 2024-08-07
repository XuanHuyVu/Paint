const canvas = document.getElementById("canvas");
const sizeInput = document.getElementById("size");
const colorInput = document.getElementById("color");
const clearButton = document.getElementById("clear");
const eraseButton = document.getElementById("erase");
const fillButton = document.getElementById("fill");
const undoButton = document.getElementById("undo");
const redoButton = document.getElementById("redo");
const uploadButton = document.getElementById("upload");
const saveButton = document.getElementById("save");
const ctx = canvas.getContext("2d");
const saveDialog = document.getElementById("save-dialog");
const saveForm = document.getElementById("save-form");
const cancelButton = document.getElementById("cancel-button");
const formatSelect = document.getElementById("format");
const uploadIcon = document.getElementById("upload-icon");
const tempCanvas = document.createElement("canvas");
const tempCtx = tempCanvas.getContext("2d");
const zoomInButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");


let size = 10;
let isPressed = false;
let color = "black";
let x = undefined;
let y = undefined;
let isErasing = false;
let isFilling = false;
let history = [];
let redoHistory = [];
let currentState = null;
let scale = 1;
const scaleStep = 0.1;

function saveState() {
    const state = canvas.toDataURL();
    history.push(state);
    redoHistory = [];
}

//khôi phục trạng thái canvas
function restoreState(state) {
    const img = new Image();
    img.src = state;
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
}


canvas.addEventListener("mousedown", (e) => {
    isPressed = true;
    x = e.offsetX;
    y = e.offsetY;
    if (!isFilling) saveState();
});

canvas.addEventListener("mouseup", () => {
    isPressed = false;
    x = undefined;
    y = undefined;
});

canvas.addEventListener("mousemove", (e) => {
    if (isPressed && !isFilling) {
        const x2 = e.offsetX;
        const y2 = e.offsetY;

        drawCircle(x2, y2);
        drawLine(x, y, x2, y2);
        x = x2;
        y = y2;
    }
});

function drawCircle(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = isErasing ? 'white' : color;
    ctx.fill();
}

//vẽ đường thẳng
function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = isErasing ? 'white' : color;
    ctx.lineWidth = size * 2;
    ctx.stroke();
}

//cài đặt kích thước cọ vẽ
sizeInput.addEventListener("change", (e) => {
    size = Math.min(Math.max(parseInt(e.target.value), 1), 50);
    updateSizeOnScreen();
});

//cài đặt màu sắc
colorInput.addEventListener("change", (e) => {
    color = e.target.value;
});

//cài đặt chức năng refresh
clearButton.addEventListener("click", () => {
    saveState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

//cài đặt chức năng xóa
eraseButton.addEventListener("click", () => {
    isErasing = !isErasing;
    eraseButton.style.backgroundColor = isErasing ? 'green' : '';
    isFilling = false;
    fillButton.style.backgroundColor = '';
});

//cài đặt chức năng tô màu
fillButton.addEventListener("click", () => {
    isFilling = !isFilling;
    fillButton.style.backgroundColor = isFilling ? 'green' : '';
    isErasing = false;
    eraseButton.style.backgroundColor = '';
});

//cài đặt chức năng undo
undoButton.addEventListener("click", () => {
    if (history.length > 0) {
        redoHistory.push(canvas.toDataURL());
        const lastState = history.pop();
        restoreState(lastState);
    }
});

//cài đặt chức năng redo
redoButton.addEventListener("click", () => {
    if (redoHistory.length > 0) {
        saveState();
        const lastRedoState = redoHistory.pop();
        restoreState(lastRedoState);
    }
});

//cài đặt chức năng upload ảnh
uploadIcon.addEventListener("click", () => {
    uploadButton.click();
});

uploadButton.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    const canvasAspectRatio = canvas.width / canvas.height;
                    const imgAspectRatio = img.width / img.height;
                    
                    let drawWidth, drawHeight, offsetX, offsetY;

                    if (imgAspectRatio > canvasAspectRatio) {
                        drawWidth = canvas.width;
                        drawHeight = canvas.width / imgAspectRatio;
                        offsetX = 0;
                        offsetY = (canvas.height - drawHeight) / 2;
                    } else {
                        drawWidth = canvas.height * imgAspectRatio;
                        drawHeight = canvas.height;
                        offsetX = (canvas.width - drawWidth) / 2;
                        offsetY = 0;
                    }

                    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                };
                img.onerror = () => {
                    console.error('Failed to load image.');
                };
            };
            reader.onerror = () => {
                console.error('Failed to read file.');
            };
            reader.readAsDataURL(file);
        } else {
            console.error('The selected file is not an image.');
        }
    } else {
        console.error('No file selected.');
    }
});


function updateSizeOnScreen() {
    sizeInput.value = size;
}

// Tô màu khi click chuột
canvas.addEventListener("click", (e) => {
    if (isFilling) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / scale);
        const y = Math.floor((e.clientY - rect.top) / scale);
        fillCanvas(x, y);
    }
});


// Cài đặt chức năng tô màu
function fillCanvas(x, y) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getColorAt(x, y, imageData);
    const fillColor = hexToRgb(color);

    if (colorsMatch(targetColor, fillColor)) return;

    floodFill(x, y, targetColor, fillColor, imageData);
    ctx.putImageData(imageData, 0, 0);
    saveState();
}

// Lấy màu tại vị trí (x, y) trên canvas
function getColorAt(x, y, imageData) {
    const index = (y * imageData.width + x) * 4;
    return [imageData.data[index], imageData.data[index + 1], imageData.data[index + 2], imageData.data[index + 3]];
}

// Kiểm tra xem hai màu có giống nhau không
function colorsMatch(color1, color2) {
    return color1[0] === color2[0] && color1[1] === color2[1] && color1[2] === color2[2] && color1[3] === color2[3];
}

// Chuyển đổi mã màu hex sang RGB
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b, 255];
}

// Tô màu theo thuật toán flood fill
function floodFill(x, y, targetColor, fillColor, imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const stack = [[x, y]];

    while (stack.length) {
        const [currentX, currentY] = stack.pop();
        const index = (currentY * width + currentX) * 4;

        if (!colorsMatch(getColorAt(currentX, currentY, imageData), targetColor)) continue;

        // Tô màu pixel hiện tại
        imageData.data[index] = fillColor[0];
        imageData.data[index + 1] = fillColor[1];
        imageData.data[index + 2] = fillColor[2];
        imageData.data[index + 3] = fillColor[3];

        // Đẩy các pixel lân cận vào stack
        if (currentX > 0) stack.push([currentX - 1, currentY]); // Pixel bên trái
        if (currentX < width - 1) stack.push([currentX + 1, currentY]); // Pixel bên phải
        if (currentY > 0) stack.push([currentX, currentY - 1]); // Pixel phía trên
        if (currentY < height - 1) stack.push([currentX, currentY + 1]); // Pixel phía dưới
    }
}

// Lưu trạng thái canvas
saveButton.addEventListener("click", () => {
    saveDialog.style.display = "block";
});

// Đóng hộp thoại lưu (Hộp thoại popup)
cancelButton.addEventListener("click", () => {
    saveDialog.style.display = "none";
});

// Lưu canvas với định dạng đã chọn (SVG, PNG, JPEG)
saveForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const format = formatSelect.value;
    saveCanvas(format);
    saveDialog.style.display = "none";
});

// Hàm lưu canvas với định dạng đã chọn
function saveCanvas(format) {
    const link = document.createElement("a");
    link.href = canvas.toDataURL(`image/${format}`);
    link.download = `drawing.${format}`;
    link.click();
}


let tool = null; // Công cụ vẽ hiện tại (null nếu không có công cụ nào được chọn)
let isDrawing = false; // Trạng thái vẽ
let startX, startY; // Điểm bắt đầu vẽ hình dạng
let history1 = []; // Lịch sử các trạng thái của canvas

// Chọn công cụ vẽ hình chữ nhật
document.getElementById("rectangle-tool").addEventListener("click", () => {
    if (tool === "rectangle") {
        tool = null;
        document.getElementById("rectangle-tool").style.backgroundColor = ''; // Reset màu nền của nút
    } else {
        tool = "rectangle";
        document.getElementById("rectangle-tool").style.backgroundColor = 'green'; // Thay đổi màu nền của nút để hiển thị trạng thái chọn
    }
});

// Chọn công cụ vẽ hình tròn
document.getElementById("circle-tool").addEventListener("click", () => {
    if (tool === "circle") {
        tool = null;
        document.getElementById("circle-tool").style.backgroundColor = ''; // Reset màu nền của nút
    } else {
        tool = "circle";
        document.getElementById("circle-tool").style.backgroundColor = 'green'; // Thay đổi màu nền của nút để hiển thị trạng thái chọn
    }
});

// Xử lý sự kiện khi nhấn chuột xuống trên canvas
canvas.addEventListener("mousedown", (e) => {
    if (tool) {
        isDrawing = true;
        startX = e.offsetX;
        startY = e.offsetY;
    }
});

// Xử lý sự kiện khi di chuyển chuột trên canvas
canvas.addEventListener("mousemove", (e) => {
    if (tool && isDrawing) {
        const endX = e.offsetX;
        const endY = e.offsetY;
        
        // Hiển thị hình dạng tạm thời (gây nhấp nháy khi di chuyển chuột)
        drawTempShape(startX, startY, endX, endY);
    }
});

// Xử lý sự kiện khi nhả chuột trên canvas
canvas.addEventListener("mouseup", (e) => {
    if (tool && isDrawing) {
        const endX = e.offsetX;
        const endY = e.offsetY;
        
        // Vẽ hình dạng cuối cùng
        drawShape(startX, startY, endX, endY);
        isDrawing = false; // Kết thúc vẽ
    }
});

// Hàm vẽ hình dạng tạm thời trên canvas phụ
function drawTempShape(x1, y1, x2, y2) {
    // Cập nhật kích thước của canvas phụ để phù hợp với kích thước của canvas chính
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Vẽ hình dạng tạm thời trên canvas phụ
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.strokeStyle = color; // Sử dụng màu hiện tại
    tempCtx.lineWidth = size; // Sử dụng kích thước hiện tại
    
    // Vẽ hình dạng tạm thời
    switch (tool) {
        case "rectangle":
            tempCtx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
            break;
        case "circle":
            tempCtx.beginPath();
            tempCtx.arc((x1 + x2) / 2, (y1 + y2) / 2, Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2, 0, Math.PI * 2);
            tempCtx.stroke();
            break;
    }

    // Xóa canvas chính và vẽ lại tất cả các phần đã vẽ trước đó
    restoreCanvas();
    ctx.drawImage(tempCanvas, 0, 0);
}

// Hàm vẽ hình dạng cuối cùng trên canvas chính
function drawShape(x1, y1, x2, y2) {
    ctx.strokeStyle = color; // Sử dụng màu hiện tại
    ctx.lineWidth = size; // Sử dụng kích thước hiện tại
    
    // Vẽ hình dạng cuối cùng
    switch (tool) {
        case "rectangle":
            ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
            break;
        case "circle":
            ctx.beginPath();
            ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2, 0, Math.PI * 2);
            ctx.stroke();
            break;
    }
}

// Hàm lưu trạng thái canvas (để khôi phục các phần đã vẽ trước đó)
function saveState() {
    const state = canvas.toDataURL();
    history1.push(state);
}

// Hàm khôi phục trạng thái canvas
function restoreCanvas() {
    if (history1.length > 0) {
        const lastState = history1[history1.length - 1];
        const img = new Image();
        img.src = lastState;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
}

function setCanvasScale(scale) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0); // Áp dụng biến đổi tỉ lệ
}

function zoomIn() {
    scale += scaleStep;
    setCanvasScale(scale);
}

function zoomOut() {
    scale = Math.max(scale - scaleStep, scaleStep); // Đảm bảo không thu nhỏ quá mức
    setCanvasScale(scale);
}

// Gán sự kiện cho các nút zoom
zoomInButton.addEventListener("click", zoomIn);
zoomOutButton.addEventListener("click", zoomOut);

// Đảm bảo khôi phục lại kích thước gốc khi thay đổi canvas nội dung
canvas.addEventListener("mousedown", () => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0); // Khôi phục kích thước gốc trước khi vẽ
});

//Hiển thị hộp thoại phím tắt và hướng dẫn sử dụng
document.addEventListener("DOMContentLoaded", () => {
    const helpButton = document.getElementById("help");
    const helpDialog = document.getElementById("help-dialog");
    const closeHelpButtons = document.querySelectorAll("#close-help, #close-help-footer");

    helpButton.addEventListener("click", () => {
        helpDialog.style.display = "block";
    });

    closeHelpButtons.forEach(button => {
        button.addEventListener("click", () => {
            helpDialog.style.display = "none";
        });
    });
});

//Chức năng phím tắt
document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (event.ctrlKey) {
        switch (key) {
            case 'z':
                event.preventDefault(); // Ngăn chặn hành động undo mặc định của trình duyệt
                undo();
                break;
            case 'y':
                event.preventDefault(); // Ngăn chặn hành động redo mặc định của trình duyệt
                redo();
                break;
            case 's':
                event.preventDefault(); // Ngăn chặn hành động save mặc định của trình duyệt
                save();
                break;
            default:
                break;
        }
    } else {
        switch (key) {
            case 'e':
                toggleErase();
                break;
            case 'f':
                toggleFill();
                break;
            case 'c':
                clearCanvas();
                break;
            case '+':
                zoomIn();
                break;
            case '-':
                zoomOut();
                break;
            case 'u':
                uploadImage();
                break;
            case 'h':
                toggleHelpDialog();
                break;
            default:
                break;
        }
    }
});

//Các hàm để gọi từ bên ngoài
function toggleErase() {
    eraseButton.click();
}

function toggleFill() {
    fillButton.click();
}

function clearCanvas() {
    clearButton.click();
}

function undo() {
    undoButton.click();
}

function redo() {
    redoButton.click();
}

function save() {
    saveButton.click();
}

function zoomIn() {
    zoomInButton.click();
}

function zoomOut() {
    zoomOutButton.click();
}

function uploadImage() {
    uploadButton.click();
}

function toggleHelpDialog() {
    const helpDialog = document.getElementById("help-dialog");
    helpDialog.style.display = helpDialog.style.display === "block" ? "none" : "block";
}
