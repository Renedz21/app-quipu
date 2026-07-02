import {
  Badge,
  Button,
  Crown,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Search,
  X,
} from "@quipu/ui"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-background p-8 text-foreground">
      <h1 className="text-2xl font-semibold">
        Quipu — Design System smoke test
      </h1>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="default">Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="ghost">Fantasma</Button>
        <Button variant="success">Éxito</Button>
        <Button variant="destructive">Peligro</Button>
        <Button variant="secondary" size="icon">
          <X />
        </Button>
        <Button variant="secondary" size="sm">
          pequeño
        </Button>
        <Button variant="secondary" disabled>
          Inactivo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>Necesidades</Badge>
        <Badge variant="warning">Gustos</Badge>
        <Badge variant="success">Ahorro</Badge>
        <Badge variant="success">
          <span className="size-1.5 rounded-full bg-success" />
          Vas bien
        </Badge>
        <Badge variant="destructive">Atención</Badge>
        <Badge variant="warning">
          <Crown />
          Premium
        </Badge>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Input placeholder="Input standalone" />

        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput placeholder="Buscar gastos..." />
        </InputGroup>

        <InputGroup>
          <InputGroupInput placeholder="Monto en soles" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>S/</InputGroupText>
          </InputGroupAddon>
        </InputGroup>

        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput placeholder="example.com" className="pl-0.5!" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>.com</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </main>
  )
}
