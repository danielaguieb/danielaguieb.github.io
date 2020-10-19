"use strict";

// Debugging
let arst = console.log.bind(console);
// let arst = function();

window.addEventListener('load', main);

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


function render(g){
	arst("render");
	let render = g.getRendering();
	// let grid = document.querySelector(".grid");
	let grid = document.getElementsByClassName("grid");
	for(let i=0; i < grid[0].children.length; i++){
		let cellRow = grid[0].children[i];
		for(let j=0; j < cellRow.children.length; j++){
			let cell = grid[0].children[i].children[j];
			if(g.validCoord(i,j)){
				cell.style.display = "inline";
        // if tree for the different states ie M, H, F, 0-9
        let cellContent = render[i].charAt(j);
        if(cellContent === 'M'){
          cell.innerHTML = "[" + cellContent + "]";
        }
        else if (cellContent === 'H'){
          cell.innerHTML = "[" + cellContent + "]";
        }
        else if (cellContent === 'F'){
          cell.innerHTML = "[" + cellContent + "]";
        }
        else if (cellContent === "0"){
          cell.innerHTML = "[ ]";
        }
        else {
          cell.innerHTML = "[" + cellContent + "]";
        }


        // cell.innerHTML = "kek";
			}
			else {
				cell.style.display = "none";
			}
		}
	}
}

function menuButton_cb(g, rows, cols, mines){
	arst("menuButton_cb");
	g.init(rows, cols, mines);
	render(g);
}


function cell_click_cb(g, cell, i, j){
	arst("cell_click_cb")

	// need functionality to not do this if cell is marked

  // if(g.arr[i][j].state === g.STATE_MARKED){
  //   arst("working");
  // }
  arst(g.arr[i][j].state);

	g.uncover(i, j);
	render(g);
}

function cell_rightClick_cb(g, cell, i, j){
  arst("cell_rightClick_cb");
  g.mark(i,j);
  render(g);
}


// $(function(){
//   $( "cell" ).bind( "taphold", tapholdHandler );
 
//   function tapholdHandler( event ){
//     $( event.target ).addClass( "flagged" );
       // mark() goes here
//   }
// });

function prepare_dom(g) {
	const grid = document.querySelector(".grid");
	const maxRows = 20; // max rows
	const maxCols = 24; // max cols

	for(let i=0; i < maxRows; i++){
		const cellRow = document.createElement("div");
		grid.appendChild(cellRow);
		for(let j=0; j < maxCols; j++){
			const cell = document.createElement("div");
			cell.className = "cell";
			cellRow.appendChild(cell);
			cell.setAttribute("data-cardRow", i);
			cell.setAttribute("data-cardCol", j);

			cell.addEventListener("click", () => {
				cell_click_cb(g, cell, i, j);
			});
      cell.addEventListener("auxclick", () => {
        cell_rightClick_cb(g, cell, i, j);
      })

			// need to add longtap event using jqueryMobile for marking
			// cell.addEventListener("click", )
		}
	}
}


function main() {
	let game = new MSGame();

	// register callback for menu buttons
	document.querySelectorAll(".menuButton").forEach((button) => {
		let [cols,rows,bombs] = button.getAttribute("gameInfo").split("x").map(s=>Number(s));

		// button.innerHTML = '${cols} &#x2715; ${rows}';
		// unsure why the above code doesn't work
		button.innerHTML = cols + 'X' + rows;

		button.addEventListener("click", menuButton_cb.bind(null, game, cols, rows, bombs));
	});

	// register callbacks for overlay click to play again
	document.querySelector("#overlay").addEventListener("click", () => {
		// Restart the game some way
	});


	prepare_dom(game);
	menuButton_cb(game, 18, 14, 10);
}


// let game = new MSGame();

// game.init(10, 8, 10);
// console.log(game.getRendering().join("\n"));
// console.log(game.getStatus());

// game.uncover(2,5);
// console.log(game.getRendering().join("\n"));
// console.log(game.getStatus());

// game.uncover(5,5);
// console.log(game.getRendering().join("\n"));
// console.log(game.getStatus());

// game.mark(4,5);
// console.log(game.getRendering().join("\n"));
// console.log(game.getStatus());


// console.log("end");

