# index.py
import sys

def main():
    if sys.platform != "win32":
        print(
            "index.py é uma demonstração de automação para Windows, não um servidor.\n"
            "Para iniciar o Studio, execute npm run dev na pasta frontend.\n"
            "O Next.js chama o backend Python automaticamente.\n"
            "Para verificar a persistência, execute da raiz: "
            "python3 -m backend.workspace_api list",
            file=sys.stderr,
        )
        return 1

    from utils.bot_desktop import BotDesktop

    bot = BotDesktop(confidence=0.8)
    
    print("Iniciando a automação em 3 segundos...")
    bot.aguardar(3)
    
    # 1) Abrir Programa (Win + R)
    print("Abrindo a Calculadora...")
    bot.abrir_programa("calc")
    bot.aguardar(2)
    
    # 2) Focar na Janela (O Spotify precisa estar rodando no seu PC)
    print("Clicando no Spotify...")
    caminho = r"./images/spotify.png"
    clicou = bot.clicar_em_imagem(caminho)

    print("Voltando o foco para a Calculadora...")
    if not bot.focar_janela("Calculadora"):
        print("Automação interrompida: não foi possível focar a Calculadora.")
        return 1
    bot.aguardar(1)
    
    # 3) Apertar Teclas
    print("Digitando a tecla '5' (5 vezes)...")
    bot.apertar_teclas('5', vezes=5, intervalo=0.3) # Adicionado intervalo entre os toques

    print("Digitando a tecla '*' (1 vez)...")
    bot.apertar_teclas('*', vezes=1, intervalo=0.3) # Adicionado intervalo entre os toques

    print("Digitando a tecla '2' (2 vezes)...")
    bot.apertar_teclas('2', vezes=2, intervalo=0.3) # Adicionado intervalo entre os toques
    
    print("Apertando enter 3 vezes...")
    bot.apertar_teclas('enter', vezes=1, intervalo=0.3)
    
    # 4) Clicar na imagem
    print("Buscando imagem para clicar...")
    caminho = r"./images/idioma.png"
    clicou = bot.clicar_em_imagem(caminho)
    
    if clicou:
        print("A imagem foi encontrada e clicada com sucesso!")
    else:
        print("O bot não encontrou a imagem na tela.")

if __name__ == "__main__":
    sys.exit(main())