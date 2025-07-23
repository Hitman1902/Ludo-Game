import {
  safeSpots,
  starSpots,
  startingPoints,
  turningPoints,
  victoryStart,
  plot1data,
  plot2data,
  plot3data,
  plot4data,
} from '$helpers/PlotData';
import {playSound} from '$helpers/SoundUtils';
import {ApplicationDispatch, RootState} from '$redux/store';
import {selectCurrentPosition, selectDiceNo} from './gameSelectors';
import {
  announceWinner,
  disableTouch,
  unfreezeDice,
  updateFireworks,
  updatePlayerChance,
  updatePlayerPieceValue,
} from './gameSlice';

const delay = (duration: number) =>
  new Promise(resolve => setTimeout(resolve, duration));

const checkWinningCriteria = (pieces: any[]) => {
  for (let piece of pieces) {
    if (piece.travelCount < 57) {
      return false;
    }
  }
  return true;
};

export const handleForwardThunk = (
  playerNo: number,
  id: string,
  pos: number,
) => {
  return async (dispatch: ApplicationDispatch, getState: () => RootState) => {
    const state = getState();
    const plottedPieces = selectCurrentPosition(state);
    const diceNo = selectDiceNo(state);

    let alpha =
      playerNo === 1 ? 'A' : playerNo === 2 ? 'B' : playerNo === 3 ? 'C' : 'D';

    const peicesAtPosition: PLAYER_PIECE[] = plottedPieces.filter(
      (e: PLAYER_PIECE) => e.pos === pos,
    );
    const piece: PLAYER_PIECE =
      peicesAtPosition[
        peicesAtPosition.findIndex((e: PLAYER_PIECE) => e.id[0] === alpha)
      ];

    dispatch(disableTouch());

    const playerKey = `player${playerNo}` as keyof typeof state.game;
    const beforePlayerPiece = (state.game[playerKey] as PLAYER_PIECE[]).find(
      (e: PLAYER_PIECE) => e.id === id,
    );
    if (!beforePlayerPiece) {
      console.log(`[Thunk] No piece found for id ${id}, aborting move.`);
      return;
    }

    let path = beforePlayerPiece.pos ?? 0;
    let travelCount = beforePlayerPiece.travelCount ?? 0;

    // DEBUG: Log dice value, piece, and starting position
    console.log(
      `[Thunk] Attempting to move piece ${id} from pos ${path} with diceNo ${diceNo}`,
    );

    for (let i = 0; i < diceNo; i++) {
      path += 1;
      travelCount += 1;

      // Enter victory path
      if (turningPoints[playerNo - 1] === path && travelCount > 51) {
        path = victoryStart[playerNo - 1];
      }
      // Only wrap if NOT in victory path
      else if (path > 52 && path < victoryStart[playerNo - 1]) {
        path = 1;
      }

      // After entering victory path, allow path to go up to 57
      // Do not wrap path if path >= victoryStart[playerNo - 1]

      // DEBUG LOGGING: Track piece movement
      console.log(
        `[Thunk] Moving piece ${id}: step ${
          i + 1
        } of ${diceNo}, new pos: ${path}, travelCount: ${travelCount}`,
      );

      dispatch(
        updatePlayerPieceValue({
          playerNo: `player${playerNo}`,
          pieceId: id,
          pos: path,
          travelCount: travelCount,
        }),
      );

      playSound('pile_move');
      await delay(200);
    }

    const updatedState = getState();
    const updatedPlottedPieces: any[] = selectCurrentPosition(updatedState);
    const finalPlot = updatedPlottedPieces.filter(e => e.pos === path);
    const ids = finalPlot.map(e => e.id[0]);

    const uniqueIDs = new Set<string>(ids);
    const areDifferentIds = uniqueIDs.size > 1;

    if (safeSpots.includes(path) || starSpots.includes(path)) {
      playSound('safe_spot');
    }

    if (
      areDifferentIds &&
      !safeSpots.includes(path) &&
      !starSpots.includes(path)
    ) {
      const enemyPiece = finalPlot.find(p => p.id[0] !== id[0]);
      if (enemyPiece) {
        const enemyId = enemyPiece.id[0];
        let no =
          enemyId === 'A' ? 1 : enemyId === 'B' ? 2 : enemyId === 'C' ? 3 : 4;

        let backwordPath = startingPoints[no - 1];
        let i = enemyPiece.pos;
        playSound('collide');

        while (i !== backwordPath) {
          dispatch(
            updatePlayerPieceValue({
              playerNo: `player${no}`,
              pieceId: enemyPiece.id,
              pos: i,
              travelCount: 0,
            }),
          );
          await delay(50);
          i--;
          if (i === 0) {
            i = 52;
          }
        }

        dispatch(
          updatePlayerPieceValue({
            playerNo: `player${no}`,
            pieceId: enemyPiece.id,
            pos: 0,
            travelCount: 0,
          }),
        );

        dispatch(unfreezeDice());
      }
    }

    if (diceNo === 6 || travelCount === 57) {
      dispatch(updatePlayerChance({chancePlayer: playerNo}));

      if (travelCount === 57) {
        playSound('home_win');
        const finalPlayerState = getState();
        const playerAllPieces = finalPlayerState.game[`player${playerNo}`];

        if (checkWinningCriteria(playerAllPieces)) {
          dispatch(announceWinner(playerNo));
          playSound('cheer');
          return;
        }

        dispatch(updateFireworks(true));
        dispatch(unfreezeDice());
        return;
      }
    } else {
      let chancePlayer: number = playerNo + 1;
      if (chancePlayer > 4) {
        chancePlayer = 1;
      }
      dispatch(updatePlayerChance({chancePlayer}));
    }

    // If you still see the piece stuck at position 6, check your UI logic for piece selection. The reducer and thunk logic allow movement beyond 6.
  };
};
