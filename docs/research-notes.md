# Research notes

## Competitive gap

The Week 1 field already contains multiple bird identifiers, garden planners, outdoor quest generators, photo-verification apps, screenless audio guides, and accessibility-navigation prototypes. GroundSignal therefore avoids another “AI tells you where to walk” loop. Its differentiator is that the outdoor motion trace becomes the input and the post-walk evidence becomes the output.

## Prior work to credit

GroundSignal does not claim to invent sidewalk accessibility auditing. The final article and repository should credit and distinguish these projects:

- [Project Sidewalk](https://github.com/ProjectSidewalk/SidewalkWebpage): remote crowdsourcing and machine-learning assessment of sidewalk accessibility.
- [Fine-grained sidewalk accessibility benchmarks](https://github.com/ProjectSidewalk/sidewalk-tagger-ai): an open dataset and benchmarks for image-based accessibility conditions.
- [SANPO](https://github.com/google-research-datasets/sanpo_dataset): scene understanding, accessibility, navigation, pathfinding, and obstacle-avoidance data.

GroundSignal’s narrower contribution is personalized, in-situ, phone-motion sensing; a calibration-first small-data workflow; transparent uncertainty; and private open-format export.

## Technical rationale

- TabPFN is designed for tabular classification and can use small labeled calibration datasets through a scikit-learn-like interface.
- The official hosted client transmits data to Prior Labs, so only derived feature rows—not raw motion samples, coordinates, or images—may be sent.
- Render can host the FastAPI service and provides an appropriate partner-category deployment story.
- The frontend must keep raw sessions in browser storage and join predictions back to local timestamps/location after inference.

## Required experiment

1. Capture labeled calibration passes on at least two surface classes.
2. Capture a separate audit walk on unseen segments.
3. Window each session without mixing adjacent windows across train/test folds.
4. Compare the transparent centroid baseline with TabPFN.
5. Report macro F1, balanced accuracy, calibration, abstention, and inference latency.
6. Include failure cases and corrected labels.
