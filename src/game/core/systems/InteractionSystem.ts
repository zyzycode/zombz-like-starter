import { DroppedResource } from '@/game/core/objects/DroppedResource';
import type { Interactable, InteractionContext } from '@/game/core/contracts/GameplayContracts';
import type { InputState, Vector2 } from '@/shared/types/game';
import type { RunSession } from '@/game/core/world/RunSession';

type InteractionActor = {
  id: string;
  position: Vector2;
  radius: number;
};

export class InteractionSystem {
  update(params: {
    actor: InteractionActor;
    input: InputState;
    runSession: RunSession;
    droppedResources: DroppedResource[];
    interactables: Interactable[];
  }) {
    const interactionContext: InteractionContext = {
      actorId: params.actor.id,
      actorPosition: params.actor.position,
      actorRadius: params.actor.radius,
      runSession: params.runSession,
    };

    const droppedResources = this.collectNearbyResources(
      params.droppedResources,
      interactionContext,
    );

    if (params.input.interactPressed) {
      const interactable = this.findNearestInteractable(params.interactables, interactionContext);
      interactable?.interact(interactionContext);
    }

    return {
      droppedResources,
    };
  }

  private collectNearbyResources(
    droppedResources: DroppedResource[],
    context: InteractionContext,
  ) {
    const remaining: DroppedResource[] = [];

    for (const resource of droppedResources) {
      if (resource.canPickup(context.actorPosition, context.actorRadius)) {
        context.runSession.addCollectedResource(resource.resourceType, resource.amount);
        continue;
      }

      remaining.push(resource);
    }

    return remaining;
  }

  private findNearestInteractable(
    interactables: Interactable[],
    context: InteractionContext,
  ) {
    let nearest: Interactable | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const interactable of interactables) {
      if (!interactable.canInteract(context)) {
        continue;
      }

      const distance = Math.hypot(
        context.actorPosition.x - interactable.position.x,
        context.actorPosition.y - interactable.position.y,
      );

      if (distance < nearestDistance) {
        nearest = interactable;
        nearestDistance = distance;
      }
    }

    return nearest;
  }
}
