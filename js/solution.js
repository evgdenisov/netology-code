'use strict'
const modeNew = document.querySelector('.mode.new');        
const inputFile = document.createElement('input');
const currentImage = document.querySelector('.current-image');
const burger = document.querySelector('.burger');
const modeComments = document.querySelector('.mode.comments');
const modeDraw = document.querySelector('.mode.draw');
const modeShare = document.querySelector('.mode.share');
const drag = document.querySelector('.drag');
const menu = document.querySelector('.menu');
const wrap = document.querySelector('.wrap.app');
const commentsTools = document.querySelector('.tool.comments-tools');
const drawTools = document.querySelector('.tool.draw-tools');
const shareTools = document.querySelector('.tool.share-tools');
const imageLoader = document.querySelector('.image-loader');
const error = document.querySelector('.error');
const errorMessage = document.querySelector('.error__message');
const commentsOff = document.querySelector('#comments-off');
const commentsOn = document.querySelector('#comments-on');
const menuUrl = document.querySelector('.menu__url');
const menuCopyBttn = document.querySelector('.menu_copy');
const colorBttns = Array.from(document.querySelectorAll('.menu__color'));
const commentsForm = document.querySelector('.comments__form').cloneNode(true);
const commentsLoader = commentsForm.querySelector('.comment .loader').parentNode.cloneNode(true);
const commentsInput = commentsForm.querySelector('.comments__input').cloneNode(true);
const canvas = document.createElement('canvas');
let timer = Date.now();
let now = null;
let mask = document.createElement('img');
let connection = null;
let color = '';
let ctx = {};
let picId = '';
let shiftX = 0;
let shiftY = 0;
let picHref = window.location.href;

mask.style.display = 'none';
mask.src = '';

if ((picHref.indexOf('?id=')) == -1) {
    console.log('no picId');
    mask.style.display = 'none';
    onOpen();
}
else {
    clickComments();
    picId = picHref.substring(picHref.indexOf('?id=') + 4);
//
    menuUrl.value = window.location.href;
    webSocket();
}

selectColor();



function mouseMove(event) {
    event.preventDefault();
    let x = event.pageX - shiftX;
    let y = event.pageY - shiftY;

    const minX = wrap.offsetLeft;
    const minY = wrap.offsetTop;
    const maxX = wrap.offsetLeft + wrap.offsetWidth - menu.offsetWidth - 1;
    const maxY = wrap.offsetTop + wrap.offsetHeight - menu.offsetHeight

    x = Math.min(x, maxX);
    y = Math.min(y, maxY);
    x = Math.max(x, minX);
    y = Math.max(y, minY);

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
}

drag.addEventListener('mousedown', (event) => {
    const bounds = menu.getBoundingClientRect();
    shiftX = event.pageX - bounds.left - window.pageXOffset;
    shiftY = event.pageY - bounds.top - window.pageYOffset;
    drag.addEventListener('mousemove', mouseMove);
    drag.addEventListener('mouseleave', () => {
        drag.removeEventListener('mousemove', mouseMove);
    });
});

drag.addEventListener('mouseup', event => {
    drag.removeEventListener('mousemove', mouseMove);
})

function webSocket() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${picId}`);
    connection.addEventListener('open', event => {
        console.log(event);
    });
    connection.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        processing(data);
    })
}

function processing(data) {
    if (data.event == 'comment') {
        const left = data.comment.left;
        const top = data.comment.top;
        const id = commentId(left, top);
        const time = data.comment.timestamp;
        const message = data.comment.message;
        createCommentForm(left, top, id);
        showMessages(id, time, message)
    }
    console.log(data)
    if (data.event == 'pic') {
        currentImage.src = data.pic.url;
        picId = data.pic.id;
        showComments(data.pic);
        if (data.pic.mask != undefined) {
            console.log('ЕСТЬ МАСКА')
            mask.src = data.pic.mask;
            mask.style.display = 'inline-block';
        }
    }
    if (data.event == 'mask') {
        mask.src = data.url;
        mask.style.display = 'inline-block';
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function showMessages(id, timestamp, messageText) {
    const dateTime = new Date(timestamp);
    const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric' , minute: 'numeric', second: 'numeric'};
    const commentsBody = document.querySelector(`#${id} .comments__body`);
    const input = commentsBody.querySelector('.comments__input');
    const commentWrap = document.createElement('div');
    commentWrap.classList.add('comment');
    const time = document.createElement('p');
    time.classList.add('comment__time');
    time.textContent = dateTime.toLocaleDateString('ru-RU', options);
    const message = document.createElement('p');
    message.classList.add('comment__message');
    message.textContent = messageText;
    commentWrap.appendChild(time);
    commentWrap.appendChild(message);
    commentsBody.insertBefore(commentWrap, input);

}

function showComments (response) {
    const comments = response.comments;
    if (comments === undefined) {
        return;
    }
    for (const comment of Object.keys(comments)) {
        const left = comments[comment].left;
        const top = comments[comment].top;
        const timestamp = comments[comment].timestamp;
        const message = comments[comment].message;
        const id = commentId(left, top);
        createCommentForm(left, top, id);
        showMessages(id, timestamp, message);
    }
}

function onOpen () { 
    modeShare.style.display = "none";
    modeComments.style.display = "none";
    modeDraw.style.display = "none";
    burger.style.display = "none"; 
}

function clickComments() {
    commentsTools.style.display = "inline-block";
    modeShare.style.display = "none";
    modeDraw.style.display = "none";
    modeNew.style.display = "none";
    wrap.addEventListener('click', commentOnClick);
}

function clickModeDraw() {
    drawTools.style = "display : inline-block";
    modeNew.style = "display : none";
    modeShare.style = "display : none";
    modeComments.style = "display : none";
    wrap.removeEventListener('click', commentOnClick);
    drawMode();
}

function clickModeShare() {
    modeShare.style = "display : inline-block";
    burger.style = "display : inline-block";
    shareTools.style = "display : inline-block";
    modeNew.style = "display : none";
    modeComments.style = "display : none";
    modeDraw.style = "display : none";
    wrap.removeEventListener('click', commentOnClick);
}

function clickBurger() {
    commentsTools.style = "display : none";
    drawTools.style = "display : none";
    shareTools.style = "display : none";
    modeNew.style = "display : inline-block";
    modeComments.style = "display : online-block";
    modeDraw.style = "display : online-block";
    modeShare.style = "display : online-block";
    canvas.style.display = 'none';
    wrap.removeEventListener('click', commentOnClick);
}

function emptyComment(bodyCom) {
    if (bodyCom.querySelector('.comment') === null) {
        wrap.removeChild(bodyCom.parentElement);
    }
}

function deleteEmptyForms() { 
    Array.from(document.querySelectorAll('.comments__form')).forEach(el => {
        if (el.querySelector('.comment') == null) {
            wrap.removeChild(el);
        }
    })
}

function loadImage(files) {
    imageLoader.style = 'display : inline-block';
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('title', files[0].name);
    formData.append('image', files[0])
    xhr.open('POST', 'https://neto-api.herokuapp.com/pic');
    xhr.send(formData);
    xhr.addEventListener('load', event => {
        mask.style.display = 'none';
        mask.src = '';
        removeForms();
        showError(files);
        imageLoader.style = 'display : none';
        const response = JSON.parse(xhr.response);
        picId = response.id;
        menuUrl.value = window.location.host + window.location.pathname + '?id=' + picId;
        window.location.href = menuUrl.value;
        console.log(response);
        currentImage.src = response.url;
        webSocket();
    }) 
}


function showError(files) {
    if (files[0].type !== 'image/png' && files[0].type !== 'image/jpeg') {
        errorMessage.textContent = 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.';
        error.style = 'display : inline-block';
        onOpen();
    }
    else {
        error.style = 'display : none';
        clickModeShare();
    }
    return;
}

function selectColor() {
    colorBttns.forEach(bttn => {
        if (bttn.checked === true) {
            switch (bttn.value) {
                case 'red': 
                    color = '#ea5d56';
                    break;
                case 'yellow':
                    color = '#f3d135';
                    break;
                case 'green':
                    color = '#6cbe47';
                    break;
                case 'blue':
                    color = '#53a7f5';
                    break;
                case 'purple':
                    color = '#b36ade';
                    break;
                default:
                    break;
            }
        }
        
    })
}

wrap.appendChild(canvas);
canvas.width = wrap.clientWidth;
canvas.height = wrap.clientHeight;
canvas.display = 'none';
canvas.style.zIndex = '150';
canvas.style.position = 'absolute';
canvas.style.left = '0';
canvas.style.top = '0';
canvas.style.display = 'none';
ctx = canvas.getContext('2d'); 


mask.classList.add('mask');

mask.width = wrap.clientWidth;
mask.height = wrap.clientHeight;
mask.style.left = '0';
mask.style.top = '0';
mask.style.zIndex = '100';
mask.style.position = 'absolute';
wrap.appendChild(mask);


function drawMode() { 
    canvas.style.display = 'inline-block'; 
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
}

canvas.addEventListener('mousedown', (event) => {
    draw(event);
    canvas.addEventListener('mousemove', draw);
});

function sendMask() {
    canvas.removeEventListener('mousemove', draw);
    now = Date.now();
    if (now - timer > 3000) {
        canvas.toBlob(blob => connection.send(blob));
        timer = now;
    }
}

canvas.addEventListener('mouseup', sendMask);
 
function draw(event) {
    if (event.target != canvas) {
        return;
    }
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.lineTo(event.layerX, event.layerY);
    ctx.closePath();
    ctx.stroke();
}


colorBttns.forEach(bttn => {
    bttn.addEventListener('click', selectColor);
})
burger.addEventListener('click', clickBurger);
modeDraw.addEventListener('click', clickModeDraw);
modeComments.addEventListener('click', clickComments);
modeShare.addEventListener('click', clickModeShare);
modeNew.addEventListener('click', (event) => {
    inputFile.click();
}) 
inputFile.addEventListener('change', () => {
    loadImage(inputFile.files);
})
Array.from(document.querySelector('.menu__toggle-bg').childNodes).forEach(el => {
    el.addEventListener('click', commentsOnOff);
});
menuCopyBttn.addEventListener('click', copyUrl);

inputFile.type = 'file';
inputFile.accept = 'image/jpeg, image/png';
inputFile.style = 'position : absolute; left : 0; top : 0; width : 100%; height : 100%; visibility : hidden';
modeNew.appendChild(inputFile);


document.body.addEventListener('drop', event => {
    event.preventDefault();
    if (currentImage.attributes.src.value !== "") {
        errorMessage.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь "Загрузить новое" в меню';
        error.style = 'display : inline-block';
        return;
    }
    const files = Array.from(event.dataTransfer.files);
    loadImage(files);
});

document.body.addEventListener('dragover', event => event.preventDefault());

function closeCheckBox(event) {
    Array.from(document.querySelectorAll('.comments__marker-checkbox')).forEach(el => {
        el.checked = false;
    });
    if (!(event === undefined)) {
        event.target.checked = true;
    }
}

function createCommentForm(left, top, id) {
    if (!(document.querySelector(`#${id}`) === null)) {
        return;
    } 
    deleteEmptyForms();
    const newCommentsForm = commentsForm.cloneNode(true);
    
    newCommentsForm.id = id;
    newCommentsForm.style = `left : ${left - 21}px; top : ${top - 14}px;`;
    newCommentsForm.style.zIndex = '250';
    if (commentsOff.checked) {
        newCommentsForm.style.display = 'none';
    }
    if (commentsOn.checked) {
        newCommentsForm.style.display = 'inline-block';
    }
    wrap.appendChild(newCommentsForm);
    const markerCheckBox = newCommentsForm.querySelector('.comments__marker-checkbox');
    closeCheckBox();
    newCommentsForm.querySelector('.comments__close').addEventListener('click', event => {
        emptyComment(event.target.parentElement); 
        markerCheckBox.checked = false;
    })
    markerCheckBox.addEventListener('click', closeCheckBox);
    newCommentsForm.querySelector('.comments__submit').addEventListener('click', event => {
        event.preventDefault();
        const newCommentForm = event.target.parentNode.parentNode;
        const messageText = newCommentForm.querySelector('textarea').value;
        showCommentsLoader(id);
        sendComment(picId, left, top, messageText);
    })
    
}

function sendComment(picId, left, top, messageText) {
    const xhr = new XMLHttpRequest();
    const body = "message=" + messageText + "&left=" + left + "&top=" + top;
    xhr.open('POST', `https://neto-api.herokuapp.com/pic/${picId}/comments`);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(body);
    xhr.addEventListener('load', event => {
        hideCommentsLoader(commentId(left, top));
    })
}

function commentOnClick(event) {
    const top = event.clientY;
    const left = event.clientX;
    const id = commentId(left, top);
    event.stopPropagation();
    if (event.target != mask) {
        return;
    }
    if (commentsOff.checked) {
        return;
    }
    createCommentForm(left, top, id); 
    document.querySelector(`#${commentId(left, top)}`).querySelector('.comments__marker-checkbox').checked = true;
}

function commentId (left, top) {
    return 'l' + `${left}` + 't' + `${top}`;
}

function showCommentsLoader(id) {
    const commentsBody = document.querySelector(`#${id} .comments__body`);
    const input = commentsBody.querySelector('.comments__input');
    const loader = commentsLoader.cloneNode(true);
    commentsBody.insertBefore(loader, input);
}

function hideCommentsLoader(id) {
    const commentsBody = document.querySelector(`#${id} .comments__body`);
    const loader = commentsBody.querySelector('.comment .loader');
    commentsBody.removeChild(loader.parentElement);
}

function commentsOnOff() {
    Array.from(document.querySelectorAll('.comments__form')).forEach(el => {
        if (commentsOff.checked) {
            el.style.display = 'none';
        }
        if (commentsOn.checked) {
            el.style.display = 'inline-block';
        }
    })
}

 Array.from(commentsForm.querySelectorAll('.comment')).forEach( elem => {
    elem.parentNode.removeChild(elem);
 });

function removeForms() {
    Array.from(document.querySelectorAll('.comments__form')).forEach(el => {
        wrap.removeChild(el);
    });
}

removeForms();


function copyUrl() {
    menuUrl.select(); 
    document.execCommand('copy'); 
}

