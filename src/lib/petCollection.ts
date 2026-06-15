import { decayPet } from "@/lib/gameLogic";
import type { NekoData, Pet, User } from "@/types";

type PersistedNekoData = Partial<Omit<NekoData, "user" | "pet" | "pets">> & {
  user?: User | null;
  pet?: Pet | null;
  pets?: Pet[] | null;
};

export function normalizeNekoData(data: PersistedNekoData | null | undefined, now = new Date()): NekoData {
  const user = data?.user ?? null;
  const rawPets = mergeActivePet(data?.pets ?? [], data?.pet ?? null);
  const decayedPets = dedupePets(rawPets).map((pet) => decayPet(pet, now));
  const requestedActiveId = data?.activePetId ?? data?.pet?.id ?? decayedPets[0]?.id ?? null;
  const activePet = decayedPets.find((pet) => pet.id === requestedActiveId) ?? decayedPets[0] ?? null;

  return {
    version: 1,
    user,
    pets: decayedPets,
    activePetId: activePet?.id ?? null,
    pet: activePet
  };
}

export function upsertPet(data: NekoData, pet: Pet): NekoData {
  const pets = data.pets.some((item) => item.id === pet.id)
    ? data.pets.map((item) => (item.id === pet.id ? pet : item))
    : [...data.pets, pet];

  return normalizeNekoData({
    ...data,
    pets,
    pet,
    activePetId: pet.id
  });
}

function mergeActivePet(pets: Pet[], activePet: Pet | null) {
  if (!activePet) return pets;
  const existingIndex = pets.findIndex((pet) => pet.id === activePet.id);
  if (existingIndex < 0) return [...pets, activePet];
  return pets.map((pet, index) => (index === existingIndex ? activePet : pet));
}

function dedupePets(pets: Pet[]) {
  const seen = new Set<string>();
  return pets.filter((pet) => {
    if (seen.has(pet.id)) return false;
    seen.add(pet.id);
    return true;
  });
}
