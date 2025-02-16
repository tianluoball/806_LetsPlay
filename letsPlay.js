//global variables
boolean wPressed = false;
boolean sPressed = false;
boolean aPressed = false;
boolean dPressed = false;

int normalFrameRate = 60; 
int trainingFrameRate = 1200;

// main thread
Game game;

void setup() {
    size(800, 600);
    frameRate(normalFrameRate); 
    game = new Game();
}

void draw() {
    game.update();
    game.display();
}

void keyPressed() {
    if (key == 'w' || key == 'W') wPressed = true;
    if (key == 's' || key == 'S') sPressed = true;
    if (key == 'a' || key == 'A') aPressed = true;
    if (key == 'd' || key == 'D') dPressed = true;
    if (key == 't' || key == 'T') {
        if (!game.trainingMode) {
            game.startTraining();
        } else {
            game.stopTraining();
        }
    }
    if (key == 'r' || key == 'R') {
        if (game.gameOver && !game.trainingMode) {
            game.initGame();  // restart game
        }
    }
}

//human player movement input
void keyReleased() {
    if (key == 'w' || key == 'W') wPressed = false;
    if (key == 's' || key == 'S') sPressed = false;
    if (key == 'a' || key == 'A') aPressed = false;
    if (key == 'd' || key == 'D') dPressed = false;
}

//simpla function that returns distance
float calcDistance(float x1, float y1, float x2, float y2) {
    return sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
}

//no need to be a class but better section view and clean main thread
class Game {
    Player human;
    AIPlayer ai;
    ArrayList<Territory> territories;
    boolean gameOver;
    boolean trainingMode;
    int trainingGamesPlayed;

    float[] championWeights;      // best AI weights
    float championWinRate;        
    int currentMatchWins;         
    int currentMatchGames;        
		
		int gameStartTime;
    int gameDuration;
    int timeRemaining;

		int normalDuration = 20000;  
    int trainingDuration = 1000; 
    
    Game() {
        championWeights = new float[11];
        for (int i = 0; i < championWeights.length; i++) {
            championWeights[i] = random(-1, 1);
        }
        championWinRate = 0;
        speedScale = 1.0;  
        initGame();
        trainingMode = false;
        trainingGamesPlayed = 0;
        currentMatchWins = 0;
        currentMatchGames = 0;
        gameDuration = normalDuration;
    }
    
    void initGame() {
        if (trainingMode) {
            // In TrainingMode we have two AI instead of one player one AI
            if (human == null || !(human instanceof AIPlayer)) {
                human = new AIPlayer(width/4, height/2, color(0, 255, 0));
            } else {
                human.x = width/4;
                human.y = height/2;
                human.energy = human.maxEnergy;
            }
            
            if (ai == null) {
                ai = new AIPlayer(3*width/4, height/2, color(255, 0, 0));
							
                // AI use Champion Weights
                ((AIPlayer)ai).setWeights(championWeights);
            } else {
                ai.x = 3*width/4;
                ai.y = height/2;
                ai.energy = ai.maxEnergy;
                ((AIPlayer)ai).setWeights(championWeights);
            }
        } else {
            // if it is not training mode，player1 is the PLAYER
            if (!(human instanceof Player) || (human instanceof AIPlayer)) {
                human = new Player(width/4, height/2, color(0, 255, 0));
            }
            if (ai == null) {
                ai = new AIPlayer(3*width/4, height/2, color(255, 0, 0));
                ((AIPlayer)ai).setWeights(championWeights);  // used best weight so far to beat HUMAN
            } else {
                ai.x = 3*width/4;
                ai.y = height/2;
                ai.energy = ai.maxEnergy;
            }
        }
				
				human.setSpeedScale(speedScale);
        ai.setSpeedScale(speedScale);
        
        territories = new ArrayList<Territory>();
        gameOver = false;
        
        // initial territories
        for (int i = 0; i < 9; i++) {
            float x = width * (0.2 + (i % 3) * 0.3);
            float y = height * (0.25 + (i / 3) * 0.25);
            territories.add(new Territory(x, y));
        }
        gameStartTime = millis();
        timeRemaining = gameDuration;
    }
    
    void startTraining() {
        trainingMode = true;
        trainingGamesPlayed = 0;
        currentMatchWins = 0;
        currentMatchGames = 0;
        
        frameRate(1200);
        gameDuration = trainingDuration;
        
        if (!(human instanceof AIPlayer)) {
            human = new AIPlayer(width/4, height/2, color(0, 255, 0));
        }
        
        // set AI to be fast in training mode
        ((AIPlayer)human).setTrainingMode(true);
        ((AIPlayer)ai).setTrainingMode(true);
        
        ((AIPlayer)human).randomizeWeights();
        initGame();
        println("Training mode started");
    }
    
    void stopTraining() {
        trainingMode = false;
        frameRate(60);
        gameDuration = normalDuration;
        
        // set AI speed to normal in normal mode
        ((AIPlayer)human).setTrainingMode(false);
        ((AIPlayer)ai).setTrainingMode(false);
        
        initGame();
        println("Training stopped. Final champion win rate: " + nf(championWinRate * 100, 0, 2) + "%");
    }
    
    void update() {
        timeRemaining = gameDuration - (millis() - gameStartTime);
        
        if (timeRemaining <= 0) {
            gameOver = true;
        }
        
        if (!gameOver) {
            if (trainingMode) {
                ((AIPlayer)human).update(territories, ai);
            } else {
                updateHumanMovement();
            }
            ai.update(territories, human);
            
            for (Territory t : territories) {
                t.update(human, ai);
            }
            
            checkWinCondition();
        } else if (trainingMode) {
            trainingGamesPlayed++;
            currentMatchGames++;
            
            // check who is the better AI
            boolean challengerWon = (countTerritories(human) > countTerritories(ai));
            if (challengerWon) {
                currentMatchWins++;
            }
            
            // 10 matches as a epoch
            if (currentMatchGames >= 10) {
								float challengerWinRate = (float)currentMatchWins / currentMatchGames;
								println("Challenge match completed - Challenger win rate: " + 
											 nf(challengerWinRate * 100, 0, 2) + "%");

								// challenger become champion
								if (challengerWinRate > championWinRate) {
										championWinRate = challengerWinRate; 
										arrayCopy(((AIPlayer)human).weights, championWeights);
										println("New champion crowned! Win rate: " + 
													 nf(championWinRate * 100, 0, 2) + "%");
										((AIPlayer)human).randomizeWeights();
								} else {
										championWinRate = 1 - challengerWinRate; 
										println("Champion defends with win rate: " + 
													 nf(championWinRate * 100, 0, 2) + "%");
										// learn and tweak weights
										((AIPlayer)human).learn(true);
										println("Challenger learning from defeats - Adjusting weights");
								}
                
                currentMatchWins = 0;
                currentMatchGames = 0;
            }
            
            initGame();
        }
    }
    
		//just movement
    void updateHumanMovement() {
        float dx = 0;
        float dy = 0;
        
        if (wPressed) dy -= 1;
        if (sPressed) dy += 1;
        if (aPressed) dx -= 1;
        if (dPressed) dx += 1;
        
        if (dx != 0 && dy != 0) {
            dx *= 0.707;
            dy *= 0.707;
        }
        
        human.x += dx * human.speed;
        human.y += dy * human.speed;
        
        // keep inside canva
        human.x = constrain(human.x, human.size/2, width-human.size/2);
        human.y = constrain(human.y, human.size/2, height-human.size/2);
        
        // restore energy over time
        human.update();
    }
    
    void checkWinCondition() {
        int humanScore = 0;
        int aiScore = 0;
        
        for (Territory t : territories) {
            if (t.owner == human) humanScore++;
            if (t.owner == ai) aiScore++;
        }
        
        if (humanScore >= 5 || aiScore >= 5) {
            gameOver = true;
        }
    }
    
    int countTerritories(Player p) {
        int count = 0;
        for (Territory t : territories) {
            if (t.owner == p) count++;
        }
        return count;
    }
    
    void display() {
        background(50);

        for (Territory t : territories) {
            t.display();
        }

        human.display();
        ai.display();

        displayScores();

        textAlign(CENTER);
        textSize(24);
        fill(255);
        text("Time: " + ceil(timeRemaining/1000.0) + "s", width/2, 30);

        if (trainingMode) {
            displayTrainingInfo();
        } else if (gameOver) {
            displayGameOver();
        }

        displayTrainingInstructions();
    }
    
    void displayScores() {
        textAlign(LEFT);
        textSize(20);
        fill(0, 255, 0);
        text("Human: " + countTerritories(human), 20, 30);
        fill(255, 0, 0);
        text("AI: " + countTerritories(ai), width-100, 30);
    }
    
    void displayGameOver() {
        textAlign(CENTER);
        textSize(32);
        fill(255);
        String winner = (countTerritories(human) > countTerritories(ai)) ? "Human Wins!" : "AI Wins!";
        text(winner, width/2, height/2);
        
        textSize(20);
        text("Press 'R' to play again", width/2, height/2 + 40);
    }
    
    void displayTrainingInfo() {
        textAlign(LEFT);
        textSize(14);
        fill(255);
        text("Training Mode: Active", 20, height-60);
        text("Games Played: " + trainingGamesPlayed, 20, height-40);
        text("Current Match: " + currentMatchGames + "/10", 20, height-20);
        text("Champion Win Rate: " + nf(championWinRate * 100, 0, 2) + "%", 20, height-80);
    }
    
    void displayTrainingInstructions() {
        textAlign(RIGHT);
        textSize(12);
        fill(200);
        text("Press 'T' to " + (trainingMode ? "stop" : "start") + " training", width-20, height-20);
    }
}

class Player {
    float x, y;
    float size;
    float baseSpeed;  
    float speed;        // might be changed base on game mode
    color playerColor;
    float energy;
    float maxEnergy;
    
    Player(float x, float y, color c) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.baseSpeed = 5;
        this.speed = baseSpeed;
        this.playerColor = c;
        this.maxEnergy = 100;
        this.energy = maxEnergy;
    }
    
    void setSpeedScale(float scale) {
        speed = baseSpeed * scale;
    }
    
		// restore energy over time
    void update() {
        energy = min(maxEnergy, energy + 0.5); 
    }
    
		//UI display
    void display() {
        fill(playerColor);
        noStroke();
        ellipse(x, y, size, size);
        
        stroke(255);
        noFill();
        rect(x - size/2, y - size - 10, size, 5);
        noStroke();
        fill(0, 255, 255);
        rect(x - size/2, y - size - 10, size * (energy/maxEnergy), 5);
    }
    
    boolean canCapture() {
        return energy >= 30;
    }
    
    void useEnergy() {
        energy -= 2;
    }
}

class AIPlayer extends Player {
    float[] weights;
    float[] weightGradients;
    float learningRate;
    Territory currentTarget;
    PVector velocity;
    float maxForce;
    float searchRadius;
		float baseSpeed;
	
		boolean trainingMode;
		
		void setTrainingMode(boolean mode) {
        trainingMode = mode;
    }
    
    AIPlayer(float x, float y, color c) {
        super(x, y, c);
        weights = new float[11];  // 增加到11个权重
        weightGradients = new float[11];
        learningRate = 0.01;
        randomizeWeights();
        velocity = new PVector(0, 0);
        maxForce = 0.5;
				baseSpeed = 5;
        searchRadius = 200;
    }
    
    void randomizeWeights() {
        for (int i = 0; i < weights.length; i++) {
            weights[i] = random(-1, 1);
        }
    }
    
    void setWeights(float[] newWeights) {
        arrayCopy(newWeights, weights);
    }
    
    void update(ArrayList<Territory> territories, Player opponent) {
        super.update();
        
        if (currentTarget == null || random(1) < 0.05 || 
            (currentTarget.owner == this && captureComplete(currentTarget))) {
            currentTarget = chooseBestTerritory(territories, opponent);
        }
        
        if (currentTarget != null) {
            if (energy < maxEnergy * 0.3 && weights[8] > 0) {  // 体力低且撤退权重为正
                retreatToSafePosition(opponent);
            } else {
                moveToTarget();
            }
        }
        
        x = constrain(x, size/2, width-size/2);
        y = constrain(y, size/2, height-size/2);
    }
    
    void retreatToSafePosition(Player opponent) {
        PVector retreat = new PVector(x - opponent.x, y - opponent.y);
        retreat.normalize();
        retreat.mult(speed);
        x += retreat.x;
        y += retreat.y;
    }
    
    Territory chooseBestTerritory(ArrayList<Territory> territories, Player opponent) {
        Territory best = null;
        float bestScore = -999999;
        
        for (Territory t : territories) {
            float score = evaluateTerritory(t, opponent, territories);
            if (score > bestScore) {
                bestScore = score;
                best = t;
            }
        }
        
        return best;
    }

		float evaluateTerritory(Territory t, Player opponent, ArrayList<Territory> territories) {
        float score = 0;
        
        float distance = calcDistance(x, y, t.x, t.y);
        float opponentDistance = calcDistance(t.x, t.y, opponent.x, opponent.y);
				score -= distance * weights[0];                    // distance weight
        if (t.owner == null) score += weights[1] * 2;     // empty weight
        if (t.owner == this) score += weights[2];         // owned terri weight
        if (t.owner == opponent) score += weights[3] * 1.5;// enemy occupied terri weight
        score += evaluateStrategicPosition(t, territories) * weights[4]; // general terri weight
        score += (energy/maxEnergy) * weights[5];         // energy weight
        score += opponentDistance * weights[6];           // other players distance weight
        score += evaluateClusterScore(t, territories) * weights[7];  // Cluster Weight
        
        score += (energy < maxEnergy * 0.3 ? weights[8] : 0);  // restore energy weight
        score += ((opponent.energy/opponent.maxEnergy) < 0.3 ? weights[9] : 0);  // opponent energy weight
        
        // energy used weight
        float expectedEnergyCost = calculateExpectedEnergyCost(t, opponent);
        score += expectedEnergyCost * weights[10];
        
        return score;
    }
    
    float evaluateStrategicPosition(Territory t, ArrayList<Territory> territories) {
        float strategicValue = 0;
        
        // what kind of terri is the most crucial
        for (Territory other : territories) {
            if (other != t) {
                float dist = calcDistance(t.x, t.y, other.x, other.y);
                if (dist < searchRadius) {
                    if (other.owner == this) {
                        strategicValue += 1.5; // self occupied
                    } else if (other.owner == null) {
                        strategicValue += 1.0; // empty
                    }
                }
            }
        }
        
        float centerDist = calcDistance(t.x, t.y, width/2, height/2);
        float centerValue = (1 - centerDist/(width/2)) * 2;
        strategicValue += centerValue;
        
        if (t.x < width * 0.1 || t.x > width * 0.9) strategicValue -= 1;
        if (t.y < height * 0.1 || t.y > height * 0.9) strategicValue -= 1;
        
        return strategicValue;
    }
    
    float evaluateClusterScore(Territory t, ArrayList<Territory> territories) {
        float clusterScore = 0;
        int ownedInRadius = 0;
        int totalInRadius = 0;
        
        for (Territory other : territories) {
            if (other != t) {
                float dist = calcDistance(t.x, t.y, other.x, other.y);
                if (dist < searchRadius) {
                    totalInRadius++;
                    if (other.owner == this) {
                        ownedInRadius++;
                    }
                }
            }
        }
        
        if (totalInRadius > 0) {
            clusterScore = (float)ownedInRadius / totalInRadius;
        }
        
        return clusterScore;
    }
    
    float calculateExpectedEnergyCost(Territory t, Player opponent) {
        float cost = 0;
        
        if (t.owner == null) {
            cost = 30;  
        } else if (t.owner == opponent) {
            cost = 50;  
        }
        
        float opponentDistance = calcDistance(t.x, t.y, opponent.x, opponent.y);
        if (opponentDistance < 100) {
            cost *= 1.5;  
        }
        
        return -cost/maxEnergy;  
    }
    
    void learn(boolean lost) {
        // learn from loss
        float adjustment = lost ? 0.1 : -0.05;  
        
        for (int i = 0; i < weights.length; i++) {
            weights[i] += random(-adjustment, adjustment);
            weights[i] = constrain(weights[i], -2, 2); 
        }
    }
    
		//AI movement
    void moveToTarget() {
        if (currentTarget == null) return;
        
        PVector desired = new PVector(currentTarget.x - x, currentTarget.y - y);
        float distance = desired.mag();
        
        if (distance < 50) {
            float m = map(distance, 0, 50, 0, baseSpeed);
            desired.normalize();
            desired.mult(m);
        } else {
            desired.normalize();
            desired.mult(baseSpeed);
        }
        
        PVector steer = PVector.sub(desired, velocity);
        steer.limit(maxForce);
        
        velocity.add(steer);
        velocity.limit(baseSpeed);
        
        float frameCorrection = 1.0 / frameRate;  
        float timeSpeed = trainingMode ? 20.0 : 1.0;  
        
        x += velocity.x * timeSpeed * 60 * frameCorrection;  
        y += velocity.y * timeSpeed * 60 * frameCorrection;
        
        x = constrain(x, size/2, width-size/2);
        y = constrain(y, size/2, height-size/2);
    }
    
    boolean captureComplete(Territory t) {
        return t.owner == this && t.captureProgress == 0;
    }
}

// we have 9 Territories
class Territory {
    float x, y;
    float size;
    Player owner;
    float captureProgress;
    
    Territory(float x, float y) {
        this.x = x;
        this.y = y;
        this.size = 40;
        this.owner = null;
        this.captureProgress = 0;
    }
    
    void update(Player p1, Player p2) {
        float d1 = calcDistance(x, y, p1.x, p1.y);
        float d2 = calcDistance(x, y, p2.x, p2.y);
        
        if (d1 < size && p1.canCapture()) {
            if (owner != p1) {
                captureProgress += (owner == null) ? 4 : 7;
                p1.useEnergy();  // 只在实际进行占领时消耗体力
                if (captureProgress >= 100) {
                    owner = p1;
                    captureProgress = 0;
                }
            }
        }
        else if (d2 < size && p2.canCapture()) {
            if (owner != p2) {
                captureProgress += (owner == null) ? 4 : 2;
                p2.useEnergy();  // 只在实际进行占领时消耗体力
                if (captureProgress >= 100) {
                    owner = p2;
                    captureProgress = 0;
                }
            }
        } else {
            captureProgress = max(0, captureProgress - 1);
        }
    }
    
		//Territory UI
    void display() {
        noFill();
        stroke(255);
        ellipse(x, y, size, size);
        
        if (owner != null) {
            fill(owner.playerColor, 100);
            noStroke();
            ellipse(x, y, size, size);
        }
        
        if (captureProgress > 0) {
            noFill();
            stroke(255);
            arc(x, y, size+10, size+10, 0, TWO_PI * (captureProgress/100));
        }
    }
}

