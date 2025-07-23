import React, {useState, useRef} from 'react';
import {View, Text, Button, StyleSheet, TouchableOpacity} from 'react-native';
import {GameEngine} from 'react-native-game-engine';

const PLAYER_COLORS = ['red', 'green', 'yellow', 'blue'];
const PLAYER_STARTS = [
  {x: 50, y: 50}, // Player 1
  {x: 300, y: 50}, // Player 2
  {x: 50, y: 300}, // Player 3
  {x: 300, y: 300}, // Player 4
];
const BOARD_PATH = [
  // Example: 52 positions, you can expand this to match your board
  ...Array(52).keys(),
];

// Piece entity renderer
const LudoPiece = ({position, color, selected, onPress}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={{
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: color,
      borderWidth: selected ? 4 : 2,
      borderColor: selected ? '#222' : '#fff',
      zIndex: selected ? 10 : 1,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
    <Text style={{color: '#fff', fontWeight: 'bold'}}>●</Text>
  </TouchableOpacity>
);

// Dice entity renderer
const Dice = ({value, onRoll, canRoll}) => (
  <TouchableOpacity
    style={{
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: '#fff',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
    }}
    onPress={onRoll}
    disabled={!canRoll}>
    <Text style={{fontSize: 24}}>🎲 {value}</Text>
    {canRoll && <Text style={{fontSize: 12, color: '#333'}}>Roll</Text>}
  </TouchableOpacity>
);

// Board renderer (placeholder, you can use your existing board UI)
const Board = () => (
  <View
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      borderWidth: 2,
      borderColor: '#888',
      borderRadius: 10,
      backgroundColor: '#e0e0e0',
    }}
  />
);

// Helper: get board position for a given step (simplified, you can use your real board logic)
function getBoardPosition(player, step) {
  // For demo: move horizontally, then vertically
  if (step < 13) return {x: 50 + step * 20, y: 50 + player * 80};
  if (step < 26)
    return {x: 50 + 12 * 20, y: 50 + player * 80 + (step - 12) * 20};
  if (step < 39)
    return {x: 50 + (12 - (step - 26)) * 20, y: 50 + player * 80 + 14 * 20};
  return {x: 50, y: 50 + player * 80 + (14 - (step - 39)) * 20};
}

// System: animate piece movement
const MoveSystem = (entities, {time}) => {
  Object.keys(entities).forEach(key => {
    const entity = entities[key];
    if (entity.type === 'piece' && entity.moveTo !== undefined) {
      // Animate towards moveTo
      const {x, y} = entity.position;
      const dx = entity.moveTo.x - x;
      const dy = entity.moveTo.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2) {
        entity.position = {...entity.moveTo};
        delete entity.moveTo;
      } else {
        entity.position = {
          x: x + dx * 0.2,
          y: y + dy * 0.2,
        };
      }
    }
  });
  return entities;
};

export default function LudoGameEngineScreen() {
  // State for turn, dice, and selected piece
  const [turn, setTurn] = useState(0); // 0-3 for 4 players
  const [diceValue, setDiceValue] = useState(1);
  const [canRoll, setCanRoll] = useState(true);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [pieceSteps, setPieceSteps] = useState(
    Array(4)
      .fill(0)
      .map(() => Array(4).fill(0)), // [player][piece] = step
  );
  const engineRef = useRef(null);

  // Build entities for all pieces
  const entities = {
    board: {renderer: <Board />},
    dice: {
      value: diceValue,
      onRoll: () => {
        if (!canRoll) return;
        const roll = Math.floor(Math.random() * 6) + 1;
        setDiceValue(roll);
        setCanRoll(false);
        setSelectedPiece(null);
      },
      canRoll,
      renderer: <Dice />,
    },
  };
  for (let p = 0; p < 4; ++p) {
    for (let i = 0; i < 4; ++i) {
      const step = pieceSteps[p][i];
      const pos = step === 0 ? PLAYER_STARTS[p] : getBoardPosition(p, step);
      entities[`piece_${p}_${i}`] = {
        type: 'piece',
        position: pos,
        color: PLAYER_COLORS[p],
        selected:
          selectedPiece &&
          selectedPiece.player === p &&
          selectedPiece.index === i,
        onPress: () => {
          if (turn === p && !canRoll && diceValue > 0) {
            // Move this piece
            const newSteps = pieceSteps.map(arr => [...arr]);
            newSteps[p][i] = Math.min(step + diceValue, 51); // 51 = last step (adjust for your board)
            setPieceSteps(newSteps);
            setCanRoll(true);
            setSelectedPiece({player: p, index: i});
            // Next turn
            setTimeout(() => {
              setTurn((turn + 1) % 4);
              setSelectedPiece(null);
            }, 800);
          }
        },
        renderer: <LudoPiece />,
      };
    }
  }

  return (
    <View style={{flex: 1}}>
      <GameEngine
        ref={engineRef}
        style={{flex: 1, backgroundColor: '#e0e0e0'}}
        systems={[MoveSystem]}
        entities={entities}
      />
      <Text style={styles.turnText}>
        Turn: Player {turn + 1} ({PLAYER_COLORS[turn]})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  turnText: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
