var container = document.querySelector('.container');
var face1 = document.querySelector('.face-1');
var face2 = document.querySelector('.face-2');

container.addEventListener('mousemove', function(event) {
  var x = event.clientX;
  var containerWidth = container.offsetWidth;
  var halfWidth = containerWidth / 2;

  if (x <= halfWidth) {
    face1.classList.add('active');
    face2.classList.remove('active');
  } else {
    face1.classList.remove('active');
    face2.classList.add('active');
  }
});
