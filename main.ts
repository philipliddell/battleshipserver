// Server

type StateName = "discovery" | "preturn" | "duringturn"
interface GameState {
    name: StateName;
    onMessage: (messageType: string, id: string, data: string) => void;
    onUpdate: () => void;
}

interface RegisteredPlayer {
    id: string;
    shipLocation: {
        x: number;
        y: number;
    }
}

interface GameData {
    currentState: GameState | undefined;
    registeredPlayers: RegisteredPlayer[];
    player1: boolean
}

const messagePrefix = "BS"

const gameData: GameData = {
    currentState: undefined,
    registeredPlayers: [],
    player1: true
}

const stateMap = {} as any;

const duringturnState: GameState = {
    name: "duringturn",
    onMessage: (messageType, id, data) => {
        const currentPlayer = gameData.player1 ? gameData.registeredPlayers[0] : gameData.registeredPlayers[1];
        const otherPlayer = gameData.player1 ? gameData.registeredPlayers[1] : gameData.registeredPlayers[0];

        if (messageType === "F" && id === currentPlayer.id) {
            const x = parseInt(data.charAt(0));
            const y = parseInt(data.charAt(1));

            if (x === otherPlayer.shipLocation.x && y === otherPlayer.shipLocation.y) {
                radio.sendString(messagePrefix + "E:" + id);
                gameData.registeredPlayers = [];
                gameData.currentState = stateMap["discovery"];
            } else {
                gameData.player1 = !gameData.player1;
                gameData.currentState = stateMap["preturn"];
            }
        }
    },
    onUpdate: () => {
        if (gameData.player1) {
            basic.showNumber(1)
        } else {
            basic.showNumber(2)
        }
    }
}
stateMap[duringturnState.name] = duringturnState;

const preturnState: GameState = {
    name: "preturn",
    onMessage: () => {

    },
    onUpdate: () => {
        const currentPlayer = gameData.player1 ? gameData.registeredPlayers[0] : gameData.registeredPlayers[1];
        radio.sendString(messagePrefix + "T" + currentPlayer.id);
        gameData.currentState = stateMap["duringturn"]
    }
}
stateMap[preturnState.name] = preturnState;

const discoveryState: GameState = {
    name: "discovery",
    onMessage: (messageType, id, data) => {
        if (messageType === "D") {
            gameData.registeredPlayers.push({
                id: id,
                shipLocation: {
                    x: parseInt(data.charAt(0)),
                    y: parseInt(data.charAt(1))
                }
            })

            radio.sendString(messagePrefix + "J" + id);

            if (gameData.registeredPlayers.length === 2) {
                gameData.currentState = stateMap["preturn"];
            }
        }
    },
    onUpdate: () => {
        basic.showNumber(gameData.registeredPlayers.length)
        led.plot(0, 0);
        led.plot(4, 4);
        led.plot(0, 4);
        led.plot(4, 0);
    }
}
stateMap[discoveryState.name] = discoveryState;

radio.onReceivedString(str => {
    if (str.substr(0, 2) !== messagePrefix) {
        return;
    }

    console.log(str)

    const withoutPrefix = str.substr(2);
    const messageType = withoutPrefix.charAt(0);
    const split = withoutPrefix.substr(1).split(":");
    const id = split[0];
    const data = split[1];

    gameData.currentState.onMessage(messageType, id, data);
})

gameData.currentState = discoveryState

basic.forever(function () {
	gameData.currentState.onUpdate();
})
