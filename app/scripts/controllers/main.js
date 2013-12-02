'use strict';

function sign(x) {
  if (x<0) {
    return -1;
  } else {
    return 1;
  }
}

function getBox(startX, startY, event) {
  var currentX = event.offsetX;
  var currentY = event.offsetY;
  var w = currentX - startX;
  var h = currentY - startY;
  var l = Math.min(Math.abs(w),Math.abs(h));
  w = l * sign(w);
  h = l * sign(h);
  return {w:w,
          h:h,
          l:l};
}

function Complex(real, imaginary) {
  if (isNaN(real) || isNaN(imaginary)) {
    throw new TypeError();
  }
  this.r = real;
  this.i = imaginary;
}

Complex.prototype.add = function(that) {
  return new Complex(this.r + that.r, this.i + that.i);
};

Complex.prototype.square = function() {
  return new Complex(this.r * this.r - this.i * this.i, 2 * this.r * this.i);
};

Complex.prototype.abs2 = function() {
  return this.r * this.r + this.i * this.i;
};


function iterate(x,y,max){
  var z = new Complex(0, 0);
  var c = new Complex(x, y);
  for (var i=0; i<max && z.abs2() < 4; ++i) {
    z = z.square().add(c);
  }
  return i;
}


function colour(i, max) {
  var s = i / max;
  if (Math.abs(s - 1.0) < 1e-6) {
    return 'rgb(0,0,0)';
  }
  return 'rgb(' + Math.floor(255 * s * s) + ',' + Math.floor(255 * Math.sqrt(s)) + ',' + Math.floor(255 * (1 - s * s)) + ')';
}


function drawFractal(x1, y1, x2, y2, width, height, max) {
  var c = document.createElement('canvas');
  c.setAttribute('width', width);
  c.setAttribute('height', height);
  var ctx=c.getContext('2d');
  
  for (var i=0; i<width; ++i) {
    for (var j=0; j<height; ++j) {
      var x = x1 + i * (x2 - x1) / width;
      var y = y2 + j * (y1 - y2) / height;
      ctx.fillStyle = colour(iterate(x, y, max), max);
      ctx.fillRect(i, j, 1, 1);
    }
  }

  return c.toDataURL('image/png');
}


angular.module('angularMandelbrotApp')
  .controller('MainCtrl', function ($scope) {
  $scope.reset = function() {
    $scope.width = 600;
    $scope.height = 600;
    $scope.x1 = -2;
    $scope.y1 = -1.2;
    $scope.x2 = 0.5;
    $scope.y2 = 1.2;
    $scope.max = 50;
    $scope.x = 0;
    $scope.y = 0;
    $scope.scale = 100;
    $scope.message='';
    $scope.draw();
  };
  
  $scope.draw = function() {
    $scope.message='Working...';
    window.setTimeout(function() {
      $scope.x=0;
      $scope.y=0;
      $scope.scale=100;
      $scope.fractal = drawFractal(parseFloat($scope.x1),
                                   parseFloat($scope.y1),
                                   parseFloat($scope.x2),
                                   parseFloat($scope.y2),
                                   parseFloat($scope.width),
                                   parseFloat($scope.height),
                                   parseFloat($scope.max));
      $scope.message='';
      $scope.$apply();
    },50);
  };
  
  $scope.zoom = function(x1, y1, x2, y2) {
    var scale = $scope.width/Math.abs(x2-x1);
    
    $scope.x=($scope.x -x1)*scale;
    $scope.y=($scope.y - y2)*scale;
    $scope.scale*=scale;
    
    x1 = $scope.x1 + x1 * ($scope.x2 - $scope.x1) / $scope.width;
    x2 = $scope.x1 + x2 * ($scope.x2 - $scope.x1) / $scope.width;
    y1 = $scope.y2 - y1 * ($scope.y2 - $scope.y1) / $scope.height;
    y2 = $scope.y2 - y2 * ($scope.y2 - $scope.y1) / $scope.height;
    
    $scope.x1 = x1;
    $scope.y1 = y1;
    $scope.x2 = x2;
    $scope.y2 = y2;
    
    $scope.draw();
    $scope.$apply();
  };
  
  if (!$scope.initialised) {
    $scope.reset();
    $scope.initialised = 1;
  } else if ($scope.initialised>1) {
    $scope.draw();
  } else {
    $scope.initialised += 1;
  }
})
  .directive('rectangledrag', function(){
  return {
    restrict: 'A',
    link: function(scope, element){
      var canvas = document.createElement('canvas');
      canvas.setAttribute('width', scope.width);
      canvas.setAttribute('height', scope.height);
      canvas.setAttribute('style', 'position:absolute');
      element[0].appendChild(canvas);
      var $canvas = element.children();
      
      var ctx = canvas.getContext('2d');
      var startX;
      var startY;
      $canvas.bind('mousedown', function(event){
        event.preventDefault();
        startX = event.offsetX;
        startY = event.offsetY;
        $canvas.bind('mousemove', mousemove);
        $canvas.bind('mouseup', mouseup);
      });
      function mousemove(event) {
        reset();

        var box = getBox(startX, startY, event);
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(startX, startY, box.w, box.h);
        ctx.strokeStyle ='rgba(255,255,255,0.5)';
        ctx.strokeRect(startX, startY, box.w, box.h);
      }
      function mouseup(event) {
        $canvas.unbind('mousemove', mousemove);
        $canvas.unbind('mouseup', mouseup);
        reset();

        var box = getBox(startX, startY, event);
        
        if (box.l>10) {
          scope.zoom(Math.min(startX, startX + box.w),
                     Math.max(startY, startY + box.h),
                     Math.max(startX, startX + box.w),
                     Math.min(startY, startY + box.h));
        }
      }
      function reset(){
        canvas.width = canvas.width;
      }
    }
  };
});