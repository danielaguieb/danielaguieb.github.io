window.addEventListener('load', main);



/*
 * still TODO: sweep logic (recursion?), css, actually working
 *
 */



function sweep(board, col, row){
	// EMPTY
}

/*
 * Click callback
 */
function tile_click_cb(board, tile_div, ind){
	if(board.started === false) 
		loadBombs(board);

	const col = ind % board.cols;
	const row = Math.floor(ind/s.cols);
	tile_div.classList.add("clicked");
	sweep(board, col, row);
	render(board);

	// TODO check win
}

/*
 * First click loads bombs onto board
 * guarantees first click is safe
 * 
 */
function loadBombs(board, row=0, col=0){
	// reset board
	for(let i=0; i < board.rows * board.cols; i++){
		board.bombs[i] = 0;
	}

	// populate bombs
	let ratio = board.bombNum / (board.rows * board.cols);
	let counter = 0;
	for(let i=0; counter < board.bombNum; i++){
		if(i >= board.bombs.length) i=0;
		// can't populate a bomb where the user first clicks
		if(i !== col * board.cols + row && board.bombs[i] > 0 && Math.random() < ratio){
			board.bombs[i] = -1;
			counter++;
		}
	}

	board.started = true;
	// start timer
	// TODO code goes here
}

/*
 * Creates board and registers callbacks for tiles
 */
function prepare_dom(board){
	const grid = document.querySelector(".grid");
	const maxSize = 24 * 20;
	for (let i=0; i<maxSize; i++){
		const tile = document.createElement("div");
		tile.className = "tile";
		tile.setAttribute("tile-index", i);
		tile.addEventListener("click", () => {
			tile_click_cb(board, tile, i);
		});

		// ALSO NEED RIGHT CLICK AND LONG TAP CALLBACKS


		grid.appendChild(tile);
	}
}

function menuButton_cb(board, cols, rows){
	board.cols = cols;
	board.rows = rows;

	// not "making solvable" here, we load bombs when they make their first click
	render(board);
}

function render(board){
	const grid = document.querySelector(".grid");
	grid.style.gridTemplateColumns = 'repeat(${board.cols}, 1fr)';
	for(let i=0; i<grid.children.length; i++){
		const tile = grid.children[i];
		const ind = Number(tile.getAttribute("tile-index"));
		if( ind >= board.rows * rows.cols){
			tile.style.display = "none";
		}
		else {
			tile.style.display = "block";
		}
	}
}

function main() {
	let board = {
		cols: null;
		rows: null;
		bombNum: null;
		time: 0;
		started: false;
		// value of 0-8 of how many bombs are around it
		// value is -1 if it itself is a bomb
		bombs: []
	};

	// register callbacks for menu buttons
	document.querySelectorAll(".menuButton").forEach((button) => {
		[cols,rows] = button.getAttribute("data-size").split("x").map(s=>Number(s));
		board.bombNum = Number(button.getAttribute("bombNum"));
		button.innerHTML = '${cols} &#x2715; ${rows}'
		button.addEventListener("click", menuButton_cb(board, cols, rows));
	});

	// callback for overlay click to play again
	document.querySelector("#overlay").addEventListener("click", () => {
		document.querySelector("#overlay").classList.remove("active");
		loadBombs(board);
	});

	// tiles for largest size and register callbacks for click
	prepare_dom(board);

	// default to medium size
	menuButton_cb(board, 18, 14)


}