import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Game, PieceColor, PieceType, MoveType } from './chess_logic.js';

// --- CONFIGURATION ---
const SQUARE_SIZE = 1;
const OFFSET = 3.5;

// --- STATE ---
const state = {
    game: new Game(),
    selected: null, // {row, col}
    cursor: { row: 1, col: 1 },
    models: {},
    pieceMeshes: [], // Array of { mesh, row, col, type, color }
    boardGroup: new THREE.Group(),
    isAnimating: false,
    highlightMeshes: []
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);
scene.fog = new THREE.Fog(0x050507, 10, 40);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// --- LIGHTING ---
scene.add(new THREE.AmbientLight(0x404040, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(5, 15, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const blueFill = new THREE.PointLight(0x00aaff, 1, 30);
blueFill.position.set(-10, 5, -10);
scene.add(blueFill);

const goldFill = new THREE.PointLight(0xffaa00, 0.5, 30);
goldFill.position.set(10, 5, 10);
scene.add(goldFill);

// --- BOARD VISUALS ---
function initBoard() {
    state.boardGroup = new THREE.Group();

    const baseGeo = new THREE.BoxGeometry(9.5, 0.5, 9.5);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.26;
    base.receiveShadow = true;
    state.boardGroup.add(base);

    for (let r = 1; r <= 8; r++) {
        for (let c = 1; c <= 8; c++) {
            const squareGeo = new THREE.PlaneGeometry(0.98, 0.98);
            const isWhite = (r + c) % 2 === 0;
            const squareMat = new THREE.MeshStandardMaterial({
                color: isWhite ? 0xeeeeee : 0x1a1a1a,
                roughness: 0.3,
                metalness: 0.2
            });
            const square = new THREE.Mesh(squareGeo, squareMat);
            square.rotation.x = -Math.PI / 2;
            square.position.set(c - 1 - OFFSET, 0, r - 1 - OFFSET);
            square.receiveShadow = true;
            state.boardGroup.add(square);
        }
    }
    scene.add(state.boardGroup);
}

// --- CURSOR & HIGHLIGHTS ---
const cursorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.05, 1),
    new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 })
);
cursorMesh.position.y = 0.02;
scene.add(cursorMesh);

function updateCursor() {
    cursorMesh.position.x = state.cursor.col - 1 - OFFSET;
    cursorMesh.position.z = state.cursor.row - 1 - OFFSET;
    cursorMesh.material.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
}

function clearHighlights() {
    state.highlightMeshes.forEach(m => scene.remove(m));
    state.highlightMeshes = [];
}

function showValidMoves(row, col) {
    clearHighlights();
    const piece = state.game.board.getSquare(row, col).occupyingPiece;
    if (!piece || piece.color !== state.game.getTurnColor()) return;

    const moves = state.game.gameplay.getValidMoves(state.game.status, state.game.board, piece, row, col);
    moves.forEach(m => {
        const highlight = new THREE.Mesh(
            new THREE.CircleGeometry(0.2, 32),
            new THREE.MeshBasicMaterial({
                color: m.type === MoveType.CAPTURE ? 0xff4444 : 0x00ffaa,
                transparent: true,
                opacity: 0.6
            })
        );
        highlight.rotation.x = -Math.PI / 2;
        highlight.position.set(m.to.col - 1 - OFFSET, 0.03, m.to.row - 1 - OFFSET);
        scene.add(highlight);
        state.highlightMeshes.push(highlight);
    });
}

// --- ASSET LOADING ---
const loader = new OBJLoader();
const modelFiles = {
    [PieceType.PAWN]: 'Pawn.obj',
    [PieceType.ROOK]: 'Rook.obj',
    [PieceType.KNIGHT]: 'Knight.obj',
    [PieceType.BISHOP]: 'Bishop.obj',
    [PieceType.QUEEN]: 'Queen.obj',
    [PieceType.KING]: 'King.obj'
};

async function loadAssets() {
    const promises = Object.entries(modelFiles).map(([type, file]) => {
        return new Promise(resolve => {
            loader.load(`/model/${file}`, (obj) => {
                state.models[type] = obj;
                resolve();
            });
        });
    });
    await Promise.all(promises);
    initBoard();
    syncPieces();
    animate();
}

function syncPieces() {
    // Clear old meshes
    state.pieceMeshes.forEach(p => scene.remove(p.mesh));
    state.pieceMeshes = [];

    for (let r = 1; r <= 8; r++) {
        for (let c = 1; c <= 8; c++) {
            const piece = state.game.board.getSquare(r, c).occupyingPiece;
            if (piece) {
                const mesh = state.models[piece.type].clone();
                mesh.scale.set(0.01, 0.01, 0.01);

                // Set color
                mesh.traverse(child => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: piece.color === PieceColor.WHITE ? 0xc5a059 : 0x222222,
                            roughness: 0.1,
                            metalness: 0.8
                        });
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                mesh.position.set(c - 1 - OFFSET, 0, r - 1 - OFFSET);
                if (piece.color === PieceColor.WHITE) mesh.rotation.y = Math.PI;

                scene.add(mesh);
                state.pieceMeshes.push({ mesh, row: r, col: c, piece });
            }
        }
    }
}

// --- GAME ACTIONS ---
function handleInteraction() {
    const { row, col } = state.cursor;

    if (state.selected) {
        // Try to move
        if (state.game.move(state.selected.row, state.selected.col, row, col)) {
            state.selected = null;
            clearHighlights();
            syncPieces();
            updateUI();
            checkGameState();
        } else {
            // Deselect or select new
            const piece = state.game.board.getSquare(row, col).occupyingPiece;
            if (piece && piece.color === state.game.getTurnColor()) {
                state.selected = { row, col };
                showValidMoves(row, col);
            } else {
                state.selected = null;
                clearHighlights();
            }
        }
    } else {
        const piece = state.game.board.getSquare(row, col).occupyingPiece;
        if (piece && piece.color === state.game.getTurnColor()) {
            state.selected = { row, col };
            showValidMoves(row, col);
        }
    }
}

function updateUI() {
    const turnEl = document.getElementById('status-display');
    const color = state.game.getTurnColor();
    turnEl.innerText = `${color}'S TURN`;
    turnEl.style.color = color === PieceColor.WHITE ? '#c5a059' : '#ffffff';
}

function checkGameState() {
    const color = state.game.getTurnColor();
    if (state.game.gameplay.isCheckMateState(state.game.status, state.game.board, color)) {
        document.getElementById('modal-title').innerText = 'CHECKMATE';
        document.getElementById('modal-text').innerText = `${color === PieceColor.WHITE ? 'BLACK' : 'WHITE'} WINS!`;
        document.getElementById('overlay').classList.remove('hidden');
    }
}

// --- MAIN LOOP ---
function animate() {
    requestAnimationFrame(animate);
    updateCursor();

    // Smooth camera rotation based on turn
    const targetRot = state.game.getTurnColor() === PieceColor.WHITE ? 0 : Math.PI;
    const currentRot = scene.rotation.y;
    scene.rotation.y += (targetRot - currentRot) * 0.05;

    renderer.render(scene, camera);
}

// --- INPUT ---
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    switch (key) {
        case 'w': state.cursor.row = Math.min(8, state.cursor.row + 1); break;
        case 's': state.cursor.row = Math.max(1, state.cursor.row - 1); break;
        case 'a': state.cursor.col = Math.max(1, state.cursor.col - 1); break;
        case 'd': state.cursor.col = Math.min(8, state.cursor.col + 1); break;
        case ' ': handleInteraction(); break;
        case 'n':
            state.game = new Game();
            state.selected = null;
            clearHighlights();
            syncPieces();
            updateUI();
            document.getElementById('overlay').classList.add('hidden');
            break;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('restart-btn').addEventListener('click', () => {
    state.game = new Game();
    state.selected = null;
    clearHighlights();
    syncPieces();
    updateUI();
    document.getElementById('overlay').classList.add('hidden');
});

loadAssets();
