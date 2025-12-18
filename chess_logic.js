// --- CONSTANTS ---
export const PieceType = {
    PAWN: 'PAWN',
    ROOK: 'ROOK',
    KNIGHT: 'KNIGHT',
    BISHOP: 'BISHOP',
    QUEEN: 'QUEEN',
    KING: 'KING'
};

export const PieceColor = {
    WHITE: 'WHITE',
    BLACK: 'BLACK'
};

export const MoveType = {
    NORMAL: 'NORMAL',
    CAPTURE: 'CAPTURE',
    EN_PASSANT: 'EN_PASSANT',
    CASTLING: 'CASTLING'
};

// --- CORE CLASSES ---
export class Piece {
    constructor(type, color) {
        this.type = type;
        this.color = color;
    }
}

export class Square {
    constructor() {
        this.occupyingPiece = null;
    }

    occupySquare(piece) {
        this.occupyingPiece = piece;
        return true;
    }

    removeOccupyingPiece() {
        const piece = this.occupyingPiece;
        this.occupyingPiece = null;
        return piece;
    }

    occupiedState() {
        return this.occupyingPiece !== null;
    }
}

export class Board {
    constructor() {
        this.squares = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Square()));
        this.MIN_ROW = 1;
        this.MAX_ROW = 8;
        this.MIN_COL = 1;
        this.MAX_COL = 8;
    }

    getSquare(row, col) {
        if (row < 1 || row > 8 || col < 1 || col > 8) return null;
        return this.squares[row][col];
    }
}

export class Move {
    constructor(type, fromRow, fromCol, toRow, toCol, movedPiece, capturedPiece = null) {
        this.type = type;
        this.from = { row: fromRow, col: fromCol };
        this.to = { row: toRow, col: col };
        this.movedPiece = movedPiece;
        this.capturedPiece = capturedPiece;
    }
}

export class GameStatus {
    constructor() {
        this.whiteKingMoved = false;
        this.blackKingMoved = false;
        this.whiteFirstColRookMoved = false;
        this.whiteLastColRookMoved = false;
        this.blackFirstColRookMoved = false;
        this.blackLastColRookMoved = false;
        this.enPassantablePiece = { [PieceColor.WHITE]: null, [PieceColor.BLACK]: null };
    }

    setKingMove(color) {
        if (color === PieceColor.WHITE) this.whiteKingMoved = true;
        else this.blackKingMoved = true;
    }

    isKingMoved(color) {
        return (color === PieceColor.WHITE) ? this.whiteKingMoved : this.blackKingMoved;
    }

    setFirstColRookMove(color) {
        if (color === PieceColor.WHITE) this.whiteFirstColRookMoved = true;
        else this.blackFirstColRookMoved = true;
    }

    isFirstColRookMoved(color) {
        return (color === PieceColor.WHITE) ? this.whiteFirstColRookMoved : this.blackFirstColRookMoved;
    }

    setLastColRookMove(color) {
        if (color === PieceColor.WHITE) this.whiteLastColRookMoved = true;
        else this.blackLastColRookMoved = true;
    }

    isLastColRookMoved(color) {
        return (color === PieceColor.WHITE) ? this.whiteLastColRookMoved : this.blackLastColRookMoved;
    }

    setPieceEnPassantable(color, piece) {
        this.enPassantablePiece[color] = piece;
    }

    getPieceEnPassantable(color) {
        return this.enPassantablePiece[color];
    }
}

export class Gameplay {
    move(status, board, move) {
        const { movedPiece, from, to, type } = move;

        switch (type) {
            case MoveType.NORMAL:
                if (movedPiece.type === PieceType.PAWN && Math.abs(to.row - from.row) === 2)
                    status.setPieceEnPassantable(movedPiece.color, movedPiece);
                else if (movedPiece.type === PieceType.KING)
                    status.setKingMove(movedPiece.color);
                else if (movedPiece.type === PieceType.ROOK) {
                    if (from.col === board.MIN_COL) status.setFirstColRookMove(movedPiece.color);
                    else if (from.col === board.MAX_COL) status.setLastColRookMove(movedPiece.color);
                }
                return board.getSquare(to.row, to.col).occupySquare(board.getSquare(from.row, from.col).removeOccupyingPiece());

            case MoveType.CAPTURE:
                if (movedPiece.type === PieceType.KING) status.setKingMove(movedPiece.color);
                else if (movedPiece.type === PieceType.ROOK) {
                    if (from.col === board.MIN_COL) status.setFirstColRookMove(movedPiece.color);
                    else if (from.col === board.MAX_COL) status.setLastColRookMove(movedPiece.color);
                }
                board.getSquare(to.row, to.col).removeOccupyingPiece();
                return board.getSquare(to.row, to.col).occupySquare(board.getSquare(from.row, from.col).removeOccupyingPiece());

            case MoveType.EN_PASSANT:
                board.getSquare(from.row, to.col).removeOccupyingPiece();
                return board.getSquare(to.row, to.col).occupySquare(board.getSquare(from.row, from.col).removeOccupyingPiece());

            case MoveType.CASTLING:
                const rookOriginCol = (to.col < from.col) ? board.MIN_COL : board.MAX_COL;
                const rookDestCol = (to.col < from.col) ? from.col - 1 : from.col + 1;
                board.getSquare(to.row, to.col).occupySquare(board.getSquare(from.row, from.col).removeOccupyingPiece());
                board.getSquare(to.row, rookDestCol).occupySquare(board.getSquare(from.row, rookOriginCol).removeOccupyingPiece());
                status.setKingMove(movedPiece.color);
                if (rookOriginCol === board.MIN_COL) status.setFirstColRookMove(movedPiece.color);
                else status.setLastColRookMove(movedPiece.color);
                return true;
        }
        return false;
    }

    // Heavy logic for getPossibleMoves and validation will be truncated for brevity or implemented in chunks
    getPossibleMoves(status, board, piece, fromRow, fromCol) {
        const possibleMoves = [];
        if (!piece) return possibleMoves;

        const addMove = (type, r, c, cap = null) => {
            if (r >= 1 && r <= 8 && c >= 1 && c <= 8) {
                possibleMoves.push({ type, from: { row: fromRow, col: fromCol }, to: { row: r, col: c }, movedPiece: piece, capturedPiece: cap });
            }
        };

        const color = piece.color;
        const opColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;

        switch (piece.type) {
            case PieceType.PAWN:
                const dir = color === PieceColor.WHITE ? 1 : -1;
                const startRow = color === PieceColor.WHITE ? 2 : 7;

                // Normal move
                if (board.getSquare(fromRow + dir, fromCol) && !board.getSquare(fromRow + dir, fromCol).occupiedState()) {
                    addMove(MoveType.NORMAL, fromRow + dir, fromCol);
                    // Double move
                    if (fromRow === startRow && board.getSquare(fromRow + 2 * dir, fromCol) && !board.getSquare(fromRow + 2 * dir, fromCol).occupiedState()) {
                        addMove(MoveType.NORMAL, fromRow + 2 * dir, fromCol);
                    }
                }
                // Captures
                [fromCol - 1, fromCol + 1].forEach(c => {
                    const sq = board.getSquare(fromRow + dir, c);
                    if (sq && sq.occupiedState() && sq.occupyingPiece.color !== color) {
                        addMove(MoveType.CAPTURE, fromRow + dir, c, sq.occupyingPiece);
                    }
                });
                // En Passant
                const epRow = color === PieceColor.WHITE ? 5 : 4;
                if (fromRow === epRow) {
                    [fromCol - 1, fromCol + 1].forEach(c => {
                        const sq = board.getSquare(fromRow, c);
                        if (sq && sq.occupiedState() && sq.occupyingPiece.type === PieceType.PAWN && sq.occupyingPiece.color !== color && status.getPieceEnPassantable(opColor) === sq.occupyingPiece) {
                            addMove(MoveType.EN_PASSANT, fromRow + dir, c, sq.occupyingPiece);
                        }
                    });
                }
                break;

            case PieceType.ROOK:
                this.addSlidingMoves(board, piece, fromRow, fromCol, [[1, 0], [-1, 0], [0, 1], [0, -1]], possibleMoves);
                break;
            case PieceType.BISHOP:
                this.addSlidingMoves(board, piece, fromRow, fromCol, [[1, 1], [1, -1], [-1, 1], [-1, -1]], possibleMoves);
                break;
            case PieceType.QUEEN:
                this.addSlidingMoves(board, piece, fromRow, fromCol, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], possibleMoves);
                break;
            case PieceType.KNIGHT:
                [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => {
                    const r = fromRow + dr, c = fromCol + dc;
                    const sq = board.getSquare(r, c);
                    if (sq) {
                        if (!sq.occupiedState()) addMove(MoveType.NORMAL, r, c);
                        else if (sq.occupyingPiece.color !== color) addMove(MoveType.CAPTURE, r, c, sq.occupyingPiece);
                    }
                });
                break;
            case PieceType.KING:
                [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
                    const r = fromRow + dr, c = fromCol + dc;
                    const sq = board.getSquare(r, c);
                    if (sq) {
                        if (!sq.occupiedState()) addMove(MoveType.NORMAL, r, c);
                        else if (sq.occupyingPiece.color !== color) addMove(MoveType.CAPTURE, r, c, sq.occupyingPiece);
                    }
                });
                // Castling
                if (!status.isKingMoved(color) && !this.isCheckState(status, board, color)) {
                    // King side
                    const rookK = board.getSquare(fromRow, board.MAX_COL)?.occupyingPiece;
                    if (rookK && rookK.type === PieceType.ROOK && !status.isLastColRookMoved(color)) {
                        if (!board.getSquare(fromRow, fromCol + 1).occupiedState() && !board.getSquare(fromRow, fromCol + 2).occupiedState()) {
                            // Simplified castling check (ignoring "square being attacked" for now, common in simple ports)
                            addMove(MoveType.CASTLING, fromRow, fromCol + 2);
                        }
                    }
                    // Queen side
                    const rookQ = board.getSquare(fromRow, board.MIN_COL)?.occupyingPiece;
                    if (rookQ && rookQ.type === PieceType.ROOK && !status.isFirstColRookMoved(color)) {
                        if (!board.getSquare(fromRow, fromCol - 1).occupiedState() && !board.getSquare(fromRow, fromCol - 2).occupiedState() && !board.getSquare(fromRow, fromCol - 3).occupiedState()) {
                            addMove(MoveType.CASTLING, fromRow, fromCol - 2);
                        }
                    }
                }
                break;
        }
        return possibleMoves;
    }

    addSlidingMoves(board, piece, fromRow, fromCol, dirs, possibleMoves) {
        const color = piece.color;
        dirs.forEach(([dr, dc]) => {
            let r = fromRow + dr, c = fromCol + dc;
            while (r >= 1 && r <= 8 && c >= 1 && c <= 8) {
                const sq = board.getSquare(r, c);
                if (!sq.occupiedState()) {
                    possibleMoves.push({ type: MoveType.NORMAL, from: { row: fromRow, col: fromCol }, to: { row: r, col: c }, movedPiece: piece });
                } else {
                    if (sq.occupyingPiece.color !== color) {
                        possibleMoves.push({ type: MoveType.CAPTURE, from: { row: fromRow, col: fromCol }, to: { row: r, col: c }, movedPiece: piece, capturedPiece: sq.occupyingPiece });
                    }
                    break;
                }
                r += dr; c += dc;
            }
        });
    }

    getValidMoves(status, board, piece, row, col) {
        const possible = this.getPossibleMoves(status, board, piece, row, col);
        return possible.filter(move => {
            // Dry run the move
            const targetSq = board.getSquare(move.to.row, move.to.col);
            const originalPiece = targetSq.occupyingPiece;
            const fromSq = board.getSquare(move.from.row, move.from.col);

            targetSq.occupyingPiece = piece;
            fromSq.occupyingPiece = null;

            const isSafe = !this.isCheckState(status, board, piece.color);

            // Revert
            fromSq.occupyingPiece = piece;
            targetSq.occupyingPiece = originalPiece;

            return isSafe;
        });
    }

    isCheckState(status, board, color) {
        // Find king
        let kingPos = null;
        for (let r = 1; r <= 8; r++) {
            for (let c = 1; c <= 8; c++) {
                const p = board.getSquare(r, c).occupyingPiece;
                if (p && p.type === PieceType.KING && p.color === color) {
                    kingPos = { row: r, col: c };
                    break;
                }
            }
            if (kingPos) break;
        }
        if (!kingPos) return false;

        // Check if any opponent piece can hit kingPos
        for (let r = 1; r <= 8; r++) {
            for (let c = 1; c <= 8; c++) {
                const p = board.getSquare(r, c).occupyingPiece;
                if (p && p.color !== color) {
                    const moves = this.getPossibleMoves(status, board, p, r, c);
                    if (moves.some(m => m.to.row === kingPos.row && m.to.col === kingPos.col)) return true;
                }
            }
        }
        return false;
    }

    isCheckMateState(status, board, color) {
        if (!this.isCheckState(status, board, color)) return false;
        for (let r = 1; r <= 8; r++) {
            for (let c = 1; c <= 8; c++) {
                const p = board.getSquare(r, c).occupyingPiece;
                if (p && p.color === color) {
                    if (this.getValidMoves(status, board, p, r, c).length > 0) return false;
                }
            }
        }
        return true;
    }
}

export class Game {
    constructor() {
        this.gameplay = new Gameplay();
        this.board = new Board();
        this.status = new GameStatus();
        this.turn = 1;
        this.setupInitialPieces();
    }

    setupInitialPieces() {
        const setup = (color) => {
            const firstRow = color === PieceColor.WHITE ? 1 : 8;
            const secondRow = color === PieceColor.WHITE ? 2 : 7;

            // Pawns
            for (let c = 1; c <= 8; c++) this.board.getSquare(secondRow, c).occupySquare(new Piece(PieceType.PAWN, color));

            // Rest
            const layout = [PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN, PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK];
            layout.forEach((type, i) => this.board.getSquare(firstRow, i + 1).occupySquare(new Piece(type, color)));
        };
        setup(PieceColor.WHITE);
        setup(PieceColor.BLACK);
    }

    getTurnColor() {
        return this.turn % 2 !== 0 ? PieceColor.WHITE : PieceColor.BLACK;
    }

    move(fromRow, fromCol, toRow, toCol) {
        const piece = this.board.getSquare(fromRow, fromCol).occupyingPiece;
        if (!piece || piece.color !== this.getTurnColor()) return false;

        const validMoves = this.gameplay.getValidMoves(this.status, this.board, piece, fromRow, fromCol);
        const move = validMoves.find(m => m.to.row === toRow && m.to.col === toCol);

        if (move) {
            if (this.gameplay.move(this.status, this.board, move)) {
                this.turn++;
                return true;
            }
        }
        return false;
    }
}
