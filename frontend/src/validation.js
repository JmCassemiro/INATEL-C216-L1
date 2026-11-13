export const NAME_MAX_LENGTH = 100;

export function validateItem({ name, description }) {
  const errors = {};
  const trimmedName = name.trim();

  if (!trimmedName) {
    errors.name = "O nome é obrigatório.";
  } else if (trimmedName.length > NAME_MAX_LENGTH) {
    errors.name = `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
  }

  return {
    errors,
    values: { name: trimmedName, description: description.trim() },
  };
}
