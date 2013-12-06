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


function colour(i, max) {
  if (i == 0) {
    return 'rgb(0,0,0)';
  }
  var s = i / max;
  return 'rgb(' + Math.floor(255 * s * s) + ',' + Math.floor(255 * Math.sqrt(s)) + ',' + Math.floor(255 * (1 - s * s)) + ')';
}

function MandelbrotSet(x1, y1, x2, y2, width, height) {
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  this.width = width;
  this.height = height;
  this.re = new Float64Array(width * height);
  this.im = new Float64Array(width * height);
  this.n = new Int32Array(width * height);
  this.steps = 0;
  for (var idx = 0; idx < width * height; idx++) {
    this.re[idx] = 0.0;
    this.im[idx] = 0.0;
    this.n[idx] = 0;
  }
  this.canvas = document.createElement('canvas');
  this.canvas.setAttribute('width', this.width);
  this.canvas.setAttribute('height', this.height);
  this.ctx = this.canvas.getContext('2d');
}

MandelbrotSet.prototype.iterate = function(steps) {
  var idx = 0
  for (var i = 0; i < this.width; i++) {
    var c_re = this.x1 + i * (this.x2 - this.x1) / (this.width - 1);
    for (var j = 0; j < this.width; j++) {
      if (this.n[idx] == 0) {
        var c_im = this.y2 + j * (this.y1 - this.y2) / (this.height - 1);
        var re = this.re[idx];
        var im = this.im[idx];
        for (var step = 1; step <= steps; step++) {
          // z = z**2 + c
          var next_re = re*re - im*im + c_re;
          var next_im = 2*re*im + c_im;
          re = next_re;
          im = next_im;
          if (re*re + im*im >= 4) {
            this.n[idx] = this.steps + step;
            break;
          }
        }
        this.re[idx] = re;
        this.im[idx] = im;
      }
      idx++;
    }
  }
  this.steps += steps;
}

MandelbrotSet.prototype.draw = function() {
  var idx = 0; 
  for (var i = 0; i < this.width; ++i) {
    for (var j = 0; j < this.height; ++j) {
      this.ctx.fillStyle = colour(this.n[idx], this.steps);
      this.ctx.fillRect(i, j, 1, 1);
      idx++;
    }
  }

  return this.canvas.toDataURL('image/png');
}


angular.module('angularMandelbrotApp')
  .controller('MainCtrl', function ($scope, $interval) {
  $scope.reset = function() {
    $scope.width = 600;
    $scope.height = 600;
    $scope.step = 50
    $scope.max = 100000;
    $scope.message='';
    $scope.x1 = -2
    $scope.x2 = 0.5
    $scope.y1 = -1.25
    $scope.y2 = 1.25
    $scope.draw();
  };

  $scope.draw = function() {
    if ('drawPromise' in $scope) {
      $interval.cancel($scope.drawPromise)
      delete $scope.drawPromise
    }
    $scope.set = new MandelbrotSet($scope.x1, $scope.y1, $scope.x2, $scope.y2, $scope.width, $scope.height);
    $scope.message='Working...';
    $scope.drawPromise = $interval(function() {
      $scope.set.iterate($scope.step)
      $scope.fractal = $scope.set.draw()
      if ($scope.set.steps >= $scope.max) {
        $scope.message='';
        $interval.cancel($scope.drawPromise);
        delete $scope.drawPromise
      }
    },50);
  }
  
  $scope.zoom = function(x1, y1, x2, y2) {
    $scope.x1 = $scope.x1 + x1 * ($scope.x2 - $scope.x1) / ($scope.width - 1);
    $scope.x2 = $scope.x1 + x2 * ($scope.x2 - $scope.x1) / ($scope.width - 1);
    $scope.y1 = $scope.y2 - y1 * ($scope.y2 - $scope.y1) / ($scope.height - 1);
    $scope.y2 = $scope.y2 - y2 * ($scope.y2 - $scope.y1) / ($scope.height - 1);
    
    $scope.draw();
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
