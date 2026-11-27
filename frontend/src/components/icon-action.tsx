import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Ação de linha só com ícone: o nome acessível diz a ação e o item ("Editar
 * Camiseta"), e a dica mostra a ação para quem usa o mouse. Usada nas listas de
 * produtos e de estoque.
 */
export function IconAction({
  label,
  tooltip,
  onClick,
  children,
}: {
  label: string;
  tooltip: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          className="text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
