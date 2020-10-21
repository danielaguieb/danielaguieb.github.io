"use strict";

// Debugging
let arst = console.log.bind(console);
// let arst = function();

window.addEventListener('load', main);


// game engine from https://repl.it/@pfederl/Minesweeper-Game-Engine
let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d( nrows, ncols, val) {
  	const res = [];
  	for( let row = 0 ; row < nrows ; row ++) {
  		res[row] = [];
  		for( let col = 0 ; col < ncols ; col ++)
  			res[row][col] = val(row,col);
  	}
  	return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
  	[min,max] = [Math.ceil(min), Math.floor(max)]
  	return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {

  	constructor(rows, cols, mines) {
      this.init(18,14,40); // medium
  	}

  	validCoord(row, col) {
  		return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
  	}

  	init(nrows, ncols, nmines) {
	  	this.nrows = nrows;
	  	this.ncols = ncols;
	  	this.nmines = nmines;
	  	this.nmarked = 0;
	  	this.nuncovered = 0;
	  	this.exploded = false;
	    // create an array
	    this.arr = array2d(
	    	nrows, ncols,
	      	() => ({mine: false, state: STATE_HIDDEN, count: 0}));
  	}

  	count(row,col) {
	  	const c = (r,c) =>
	  		(this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
	  	let res = 0;
	  	for( let dr = -1 ; dr <= 1 ; dr ++ )
	  		for( let dc = -1 ; dc <= 1 ; dc ++ )
	  			res += c(row+dr,col+dc);
	  		return res;
  	}

  	sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
        let allowed = [];
        for(let r = 0 ; r < this.nrows ; r ++ ) {
        	for( let c = 0 ; c < this.ncols ; c ++ ) {
        		if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
        			allowed.push([r,c]);
        	}
        }
        this.nmines = Math.min(this.nmines, allowed.length);
        for( let i = 0 ; i < this.nmines ; i ++ ) {
        	let j = rndInt(i, allowed.length-1);
        	[allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        	let [r,c] = allowed[i];
        	this.arr[r][c].mine = true;
        }
	    // erase any marks (in case user placed them) and update counts
	    for(let r = 0 ; r < this.nrows ; r ++ ) {
	     	for( let c = 0 ; c < this.ncols ; c ++ ) {
	      		if(this.arr[r][c].state == STATE_MARKED)
	      			this.arr[r][c].state = STATE_HIDDEN;
	      		this.arr[r][c].count = this.count(r,c);
	      	}
	    }
	    let mines = []; let counts = [];
	    for(let row = 0 ; row < this.nrows ; row ++ ) {
	      	let s = "";
	      	for( let col = 0 ; col < this.ncols ; col ++ ) {
	      		s += this.arr[row][col].mine ? "B" : ".";
	      	}
	      	s += "  |  ";
	      	for( let col = 0 ; col < this.ncols ; col ++ ) {
	      		s += this.arr[row][col].count.toString();
	      	}
	      	mines[row] = s;
	    }
	    console.log("Mines and counts after sprinkling:");
	    console.log(mines.join("\n"), "\n");
  	}

    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    uncover(row, col) {
    	console.log("uncover", row, col);
      	// if coordinates invalid, refuse this request
      	if( ! this.validCoord(row,col)) return false;
	    // if this is the very first move, populate the mines, but make
	    // sure the current cell does not get a mine
	    if( this.nuncovered === 0)
	      	this.sprinkleMines(row, col);
	    // if cell is not hidden, ignore this move
	    if( this.arr[row][col].state !== STATE_HIDDEN) return false;
	    // floodfill all 0-count cells
	    const ff = (r,c) => {
	      	if( ! this.validCoord(r,c)) return;
	      	if( this.arr[r][c].state !== STATE_HIDDEN) return;
	      	this.arr[r][c].state = STATE_SHOWN;
	      	this.nuncovered ++;
	      	if( this.arr[r][c].count !== 0) return;
	      	ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
	      	ff(r  ,c-1);         ;ff(r  ,c+1);
	      	ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
	    };
	    ff(row,col);
	    // have we hit a mine?
	    if( this.arr[row][col].mine) {
	      	this.exploded = true;
	    }
	    return true;
  	}

    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    mark(row, col) {
    	console.log("mark", row, col);
      	// if coordinates invalid, refuse this request
      	if( ! this.validCoord(row,col)) return false;
      	// if cell already uncovered, refuse this
      	console.log("marking previous state=", this.arr[row][col].state);
      	if( this.arr[row][col].state === STATE_SHOWN) return false;
      	// accept the move and flip the marked status
      	this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      	this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
      	STATE_HIDDEN : STATE_MARKED;
      	return true;
  }

    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
    	const res = [];
    	for( let row = 0 ; row < this.nrows ; row ++) {
    		let s = "";
    		for( let col = 0 ; col < this.ncols ; col ++ ) {
    			let a = this.arr[row][col];
    			if( this.exploded && a.mine) s += "M";
    			else if( a.state === STATE_HIDDEN) s += "H";
    			else if( a.state === STATE_MARKED) s += "F";
    			else if( a.mine) s += "M";
    			else s += a.count.toString();
    		}
    		res[row] = s;
    	}
    	return res;
    }

    getStatus() {
    	let done = this.exploded ||
    	this.nuncovered === this.nrows * this.ncols - this.nmines;
    	return {
    		done: done,
    		exploded: this.exploded,
    		nrows: this.nrows,
    		ncols: this.ncols,
    		nmarked: this.nmarked,
    		nuncovered: this.nuncovered,
    		nmines: this.nmines
    	}
    }
}

return _MSGame;

})();

// simple stopwatch functionality from https://jsbin.com/IgaXEVI/167/
let stopwatch = function (elem, delay){
	let started, offset, clock, interval;

	// reset();

	function hasStarted(){ 
		return started
	}

	function start(){
		if(!interval){
			offset = Date.now();
			interval = setInterval(update, delay);
		}
	}

	function stop(){
		if(interval){
			clearInterval(interval);
			interval = null;
		}
	}

	function reset(){
		stop();
		clock = 0;
		started = false;
		rendersw();
	}

	function rendersw(){
		elem.innerHTML = "Time: " + Math.round(clock/1000);
	}

	function update(){
		clock += delta();
		rendersw();
	}

	function delta(){
		let now = Date.now();
		let d = now - offset;
		offset = now;
		return d;
	}

	this.start = start;
	this.stop = stop;
	this.reset = reset;
}


function render(g, sw){
	let render = g.getRendering();
	arst(render);
	const grid = document.querySelector(".grid");
	grid.style.gridTemplateColumns = 'repeat(' + g.ncols + ', 1fr)';
	arst("nrows is " + g.nrows + " and 9 div by that is " + Math.floor(9/g.nrows));
	arst("ncols is " + g.ncols + " and 9 % mod by that is " + (9%g.ncols));

	// render each cell and it's cellContent
	for(let i=0; i < grid.children.length; i++){
		let i_coord = Math.floor(i / g.nrows);
		let j_coord = i % g.ncols;
		let cell = grid.children[i];
		let cellContent = cell.firstChild;
		if(g.validCoord(i_coord,j_coord)){
			cell.style.display = "inline";
	        // if tree for the different states ie M, H, F, 0-8
	        const renderContent = (render[i_coord]).charAt(j_coord);
	        if(renderContent === 'H'){
	        	cellContent.innerHTML = '';
				cell.setAttribute("state", "hidden");
	        }
	        else if (renderContent === "0"){
	        	cellContent.innerHTML = '';
				cell.setAttribute("state", "revealed");
	        }
	        else if (renderContent === 'F'){
	        	cellContent.innerHTML = renderContent;
			}
			// covers mines and 1-8
	        else {
	        	cellContent.innerHTML = renderContent;		
				cell.setAttribute("state", "revealed");
	        }
	    }
	    else {
	    	cell.style.display = "none";
	    }
	}

	// flag counter
	let status = g.getStatus();
	document.querySelector(".flags").innerHTML 
		= "Flags: " + (status.nmines - status.nmarked);

	// status check
	if(status.done === true){
		if(status.exploded === true) {
			document.querySelector(".statusMsg").innerHTML 
				= "You Lost";		
		}
		else {
			document.querySelector(".statusMsg").innerHTML 
				= "You Won"
		}
		document.querySelector("#overlay").classList.toggle("active");
		sw.stop();
	}
}

function menuButton_cb(g, rows, cols, mines, sw){
	g.init(rows, cols, mines);
	sw.reset();
	render(g, sw);
}


function cell_click_cb(g, cell, i, j, sw){
	arst("cell_click_cb")
	arst(g.arr[i][j].state);
	if(g.arr[i][j].state !== g.STATE_MARKED){
		sw.start();
		g.uncover(i, j);
		render(g, sw);
	}
}

function cell_rightClick_cb(g, cell, i, j, sw){
	arst("cell_rightClick_cb");
	g.mark(i,j);
	render(g,sw);
}

function prepare_dom(g, sw) {
	const grid = document.querySelector(".grid");
	const maxRow = 24;
	const maxCol = 20;
	const maxSize = maxRow * maxCol;

	for(let i=0; i < maxSize; i++){
		let i_coord = Math.floor(i / maxRow);
		let j_coord = i % maxCol;
		const cell = document.createElement("div");
		cell.className = "cell";
		cell.setAttribute("data-cardRow", i_coord);
		cell.setAttribute("data-cardCol", j_coord);
		cell.setAttribute("state", "hidden");

		if((i_coord%2 === 0 && j_coord%2 !==0) || (i_coord%2 !== 0 && j_coord%2 === 0))
			cell.setAttribute("shade", "dark");
		else
			cell.setAttribute("shade", "light");

		let cellContent = document.createElement("div");
		cellContent.className = "cellContent";
		cell.appendChild(cellContent);

		cell.addEventListener("click", () => {
			cell_click_cb(g, cell, i_coord, j_coord, sw);
		});
		cell.addEventListener("auxclick", () => {
			cell_rightClick_cb(g, cell, i_coord, j_coord, sw);
		});
		cell.addEventListener("contextmenu", e => {
			e.preventDefault();
		});

		grid.appendChild(cell);
		// need to implement long tap still
	}
}


function main() {
	let game = new MSGame();
	let stopw = document.querySelector(".timer");
	let swatch = new stopwatch(stopw, 1000);

	// register callback for menu buttons
	document.querySelectorAll(".menuButton").forEach((button) => {
		let [cols,rows,bombs] = button.getAttribute("gameInfo").split("x").map(s=>Number(s));

		// button.innerHTML = '${cols} &#x2715; ${rows}';
		// unsure why the above code doesn't work
		button.innerHTML = cols + 'X' + rows;
		button.addEventListener("click", menuButton_cb.bind(null, game, cols, rows, bombs, swatch));
	});

	prepare_dom(game, swatch);
	menuButton_cb(game, 18, 14, 40, swatch);

	// register callbacks for overlay click to play again
	document.querySelector("#overlay").addEventListener("click", () => {
		document.querySelector("#overlay").classList.remove("active");
		menuButton_cb(game, game.nrows, game.ncols, game.nmines, swatch);
	});
}