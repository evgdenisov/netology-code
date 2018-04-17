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
let bodyW = document.body.clientWidth;
let bodyH = document.body.clientHeight;
let commentResize = {};
let x = {};
let y = {};

function onOpen () { 
    menu.dataset.state = 'initial';
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

function removeCommetns() {
    Array.from(commentsForm.querySelectorAll('.comment')).forEach( elem => {
        elem.parentNode.removeChild(elem);
    });
}

function removeForms() {
    Array.from(document.querySelectorAll('.comments__form')).forEach(el => {
        wrap.removeChild(el);
    });
}



function dropMenu(event) {
    const bounds = menu.getBoundingClientRect();
    shiftX = event.pageX - bounds.left - window.pageXOffset;
    shiftY = event.pageY - bounds.top - window.pageYOffset;
    menu.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', () => {
        menu.removeEventListener('mousemove', mouseMove);
    });
}

function mouseMove(event) {
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


function dropFiles(event) {
    event.preventDefault();
    if (currentImage.attributes.src.value !== "") {
        errorMessage.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь "Загрузить новое" в меню';
        error.classList.remove('hidden');
        return;
    }
    const files = Array.from(event.dataTransfer.files);
    if (showError(files)) { 
        loadImage(files);
    }
}

function showError(files) {
    if (files[0].type !== 'image/png' && files[0].type !== 'image/jpeg') {
        errorMessage.textContent = 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.';
        error.classList.remove('hidden');
        onOpen();
    }
    else {
        error.classList.add('hidden');
        return true;
    }
}

function loadImage(files) {
    imageLoader.classList.remove('hidden');
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('title', files[0].name);
    formData.append('image', files[0])
    xhr.open('POST', 'https://neto-api.herokuapp.com/pic');
    xhr.send(formData);
    xhr.addEventListener('load', event => {
        mask.classList.add('hidden');
        mask.src = '';
        removeForms();
        imageLoader.classList.add('hidden');
        const response = JSON.parse(xhr.response);
        picId = response.id;
        const link = window.location.protocol + '//' + window.location.host + window.location.pathname + '?id=' + picId
        menuUrl.value = link + '&share';
        location.href = link;
        webSocket();
        clickModeShare();
    }) 
}

function clickModeShare() { 
    menu.dataset.state = 'selected';
    modeShare.dataset.state = 'selected';
    checkMenuPosition();
    mask.removeEventListener('click', commentOnClick);
    currentImage.removeEventListener('click', commentOnClick);
}

function copyUrl() {
    menuUrl.select(); 
    document.execCommand('copy'); 
}

function checkMenuPosition() {
    let bounds = menu.getBoundingClientRect();
    if (document.body.clientWidth < bounds.right) {
        let x = Number(menu.style.left.substring(0, menu.style.left.indexOf('px')));
        let newX = x + document.body.clientWidth - bounds.right;
        menu.style.left = `${newX}px`;
    }
}

function webSocket() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${picId}`);
    connection.addEventListener('open', event => {
        console.log('open');
    });
    connection.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        processing(data);
    })
    connection.addEventListener('close', event => {
        console.log('ws closed')
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
        showMessages(id, time, message);
    }
    if (data.event == 'pic') {
        currentImage.src = data.pic.url;
        
        picId = data.pic.id;
        showComments(data.pic);
        commentResize = data.pic;
        if (data.pic.mask != undefined) {
            mask.src = data.pic.mask;
            mask.classList.remove('hidden');
        }
    }
    if (data.event == 'mask') {
        mask.src = data.url;
        mask.classList.remove('hidden');
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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


function clickBurger() {
    closeAllModes();
    canvas.classList.add('hidden');
    error.classList.add('hidden');
    menu.dataset.state = 'default';
    document.removeEventListener('mouseup', sendMask);
    mask.removeEventListener('click', commentOnClick);
    currentImage.removeEventListener('click', commentOnClick);
    anableCheckBox();
    checkMenuPosition();
}

function closeAllModes() {
    Array.from(document.querySelectorAll('.menu__item.mode')).forEach(modeEl => {
        modeEl.dataset.state = 'initial';
    })
}

function anableCheckBox() {
    Array.from(document.querySelectorAll('.comments__marker-checkbox')).forEach(el => {
        el.removeEventListener('click', defaultCheckBox)
    }) 
}


function clickComments() { 
    menu.dataset.state = 'selected';
    modeComments.dataset.state = 'selected';
    if (mask.classList.contains('hidden')) {
        currentImage.addEventListener('click', commentOnClick);
    }
    else {
        mask.addEventListener('click', commentOnClick);
    }
}

function commentsOnOff() {
    Array.from(document.querySelectorAll('.comments__form')).forEach(el => {
        if (commentsOff.checked) {
            el.classList.add('hidden');
        }
        if (commentsOn.checked) {
            el.classList.remove('hidden');
        }
    })
}


function commentOnClick(event) {
    const top = event.layerY;
    const left = event.layerX;
    const id = commentId(left, top);
    if (commentsOff.checked) {
        return;
    }
    if (event.target == currentImage || event.target == mask) {
        createCommentForm(left, top, id); 
        document.querySelector(`#${commentId(left, top)}`).querySelector('.comments__marker-checkbox').checked = true;
    }
}

function commentId (left, top) {
    return 'l' + `${Math.round(left)}` + 't' + `${Math.round(top)}`;
}

function createCommentForm(left, top, id) {
    const newLeft = left - 21 + currentImage.getBoundingClientRect().left;
    const newTop = top - 14 + currentImage.getBoundingClientRect().top;
    if (!(document.querySelector(`#${id}`) === null)) {
        return;
    } 
    deleteEmptyForms();
    const newCommentsForm = commentsForm.cloneNode(true);
    
    newCommentsForm.id = id;
    newCommentsForm.style = `left : ${newLeft}px; top : ${newTop}px;`;
    if (commentsOff.checked) {
        newCommentsForm.classList.add('hidden');
    }
    if (commentsOn.checked) {
        newCommentsForm.classList.remove('hidden');
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
        let messageText = newCommentForm.querySelector('textarea').value;
        if (messageText == '') {
            return;
        }
        showCommentsLoader(id);
        sendComment(picId, left, top, messageText);
        newCommentForm.querySelector('textarea').value = '';
    })  
}

function deleteEmptyForms() { 
    Array.from(document.querySelectorAll('.comments__form')).forEach(el => {
        if (el.querySelector('.comment') == null) {
            wrap.removeChild(el);
        }
    })
}

function closeCheckBox(event) {
    Array.from(document.querySelectorAll('.comments__marker-checkbox')).forEach(el => {
        el.checked = false;
    });
    if (!(event === undefined)) {
        event.target.checked = true;
    }
}

function emptyComment(bodyCom) {
    if (bodyCom.querySelector('.comment') === null) {
        wrap.removeChild(bodyCom.parentElement);
    }
}


function showCommentsLoader(id) {
    const commentsBody = document.querySelector(`#${id} .comments__body`);
    const input = commentsBody.querySelector('.comments__input');
    const loader = commentsLoader.cloneNode(true);
    commentsBody.insertBefore(loader, input);
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

function hideCommentsLoader(id) {
    const commentsBody = document.querySelector(`#${id} .comments__body`);
    const loader = commentsBody.querySelector('.comment .loader');
    commentsBody.removeChild(loader.parentElement);
}


function clickModeDraw() { 
    menu.dataset.state = 'selected';
    modeDraw.dataset.state = 'selected';
    mask.removeEventListener('click', commentOnClick);
    currentImage.removeEventListener('click', commentOnClick);
    disableCheckBox();
    drawMode();
}

function disableCheckBox() {
    Array.from(document.querySelectorAll('.comments__marker-checkbox')).forEach(el => {
        el.addEventListener('click', defaultCheckBox);
    })
}

function drawMode() { 
    canvas.classList.remove('hidden');
    document.addEventListener('mouseup', sendMask);
    resizeCanvas();
}

function resizeCanvas() {
    canvas.width = mask.width = document.querySelector('.current-image').width;
    canvas.height =  mask.height = document.querySelector('.current-image').height;
}

function canvasMouseDown(event) {
    x = event.layerX;
    y = event.layerY;
    draw(event);
    canvas.addEventListener('mousemove', draw);
}

function draw(event) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(event.layerX, event.layerY);
    ctx.closePath();
    ctx.stroke();
    x = event.layerX;
    y = event.layerY;
}

function sendMask(event) {
    canvas.removeEventListener('mousemove', draw);
    if (event.target !== canvas) {
        return;
    }
    now = Date.now();
    if (now - timer > 3000) {
        canvas.toBlob(blob => connection.send(blob));
        timer = now;
    }
}
 

function defaultCheckBox(event) {
    event.preventDefault();
}

function windowResize() {
    let x = Number(menu.style.left.substring(0, menu.style.left.indexOf('px')));
    let y = Number(menu.style.top.substring(0, menu.style.top.indexOf('px')));
    let changeX = bodyW - document.body.clientWidth;
    let changeY = bodyH - document.body.clientHeight;
    if ((x - changeX < 0) || (y - changeY < 0)) {
        return;
    }
    let newX = x - changeX;
    let newY = y - changeY;

    menu.style.left = `${newX}px`;
    menu.style.top = `${newY}px`;
    bodyW = document.body.clientWidth;
    bodyH = document.body.clientHeight;
    resizeCanvas();
    removeForms();
    showComments(commentResize);
}

mask.classList.add('mask');
mask.classList.add('hidden');
mask.src = '';
wrap.appendChild(mask);
wrap.appendChild(canvas);
canvas.classList.add('hidden');
ctx = canvas.getContext('2d'); 

inputFile.type = 'file';
inputFile.accept = 'image/jpeg, image/png';
inputFile.classList.add('inputFile');
modeNew.appendChild(inputFile);

if ((picHref.indexOf('?id=')) == -1) {
    mask.classList.add('hidden');
    onOpen();
} 
else {
    let indexOfId = picHref.indexOf('?id=') + 4;
    let indexOfShare = picHref.indexOf('&share');
    if (indexOfShare == -1) {
        picId = picHref.substring(indexOfId);
        webSocket();
        clickModeShare();
    }
    else {
        picId = picHref.substring(indexOfId, indexOfShare);
        webSocket();
        clickComments();

    }
    menuUrl.value = window.location.href + '&share';  
      
}

selectColor();
removeCommetns();
removeForms();

drag.addEventListener('mousedown', dropMenu);
burger.addEventListener('click', clickBurger);
modeDraw.addEventListener('click', clickModeDraw);
modeComments.addEventListener('click', clickComments);
modeShare.addEventListener('click', clickModeShare);
canvas.addEventListener('mousedown', canvasMouseDown);
menuCopyBttn.addEventListener('click', copyUrl);
document.body.addEventListener('drop', dropFiles);
document.body.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('resize', windowResize);

drag.addEventListener('mouseup', event => {
    drag.removeEventListener('mousemove', mouseMove);
})
colorBttns.forEach(bttn => {
    bttn.addEventListener('click', selectColor);
})
modeNew.addEventListener('click', (event) => {
    error.classList.add('hidden');
    inputFile.click();
}) 
inputFile.addEventListener('change', () => {
    loadImage(inputFile.files);
})
Array.from(document.querySelector('.menu__toggle-bg').childNodes).forEach(el => {
    el.addEventListener('click', commentsOnOff);
});







