---
title: Volta에 대해서
created: 2023-01-25
updated: 2025-02-20
tags: [ 'node', 'npm', 'yarn', 'pnpm', 'volta', 'package-manager' ]
category: Web
thumbnail: /src/content/blog/web/common/assets/volta.png
---

![volta.png](./assets/volta.png)

> ❓ Volta: nvm과 유사한 Node.js 버전을 관리하기 위해 사용하는 cli 툴

## 개요

프로젝트마다 Node.js 버전을 다르게 쓰는 케이스가 있으며 이를 대응하기 이전에는 nvm을 사용하고 있었다.  
하지만 여러 프로젝트를 스위칭하면서 개발할 때, 내가 쓰고 있는 버전을 자주 바꿔줘야할 필요가 있어  
이 과정에서 실수가 발생하기도 하는 등 혼란스러운 상황이 자주 발생했다.

이에 프로젝트마다 노드 버전을 고정해서 사용할 수 있는 방법이 없을까하고 찾아보던 중  
volta라는 툴이 nvm처럼 node.js 버전을 관리할 수 있고, package.json에 node.js 버전을 고정시킬 수 있는 것을 발견.  
이 툴의 사용 방법 및 경험에 대해 소개해보고자 한다.

## 기본 사용법

### 설치

아래의 링크를 들어가 문서대로 수행하면 됨. (매우 간단...)  
[https://docs.volta.sh/guide/getting-started](https://docs.volta.sh/guide/getting-started)

- Unix (linux, mac-os)

  ```bash title="terminal"
  curl https://get.volta.sh | bash
  ```
  - Unix 계열에서 설치해도 동작하지 않을 경우.

    사용하고 있는 셀에서 volta가 환경변수로 등록이 안되어서 발생한 케이스.  
    셀 제일 하단에 아래 스크립트를 추가하면 해결.

      - bash: .bashrc에 아래 스크립트 추가
      - zsh:  .zshrc에 아래 스크립트 추가

    ```json title=".bashrc or .zshrc"
    export VOLTA_HOME="$HOME/.volta"
    export PATH="$VOLTA_HOME/bin:$PATH"
    ```
- Windows: 위 링크의 `downlaod and run the windows installer` 클릭하여 설치파일 다운받아 설치

### 프로젝트에서 사용할 node 버전 지정

package.json 최하단에 아래와 같이 Node, 패키지매니저 버전 입력 시, 해당 프로젝트 들어갈 때 자동으로 Node 버전이 변경됨  
> 📌 사용할 노드 버전을 정확히 명시해야 함

```json title="packge.json"
{
  "name": "volta-test",
  "scripts": {
    ...
  },
  "dependencies": {
    ...
  },
  "devDependencies": {
    ...
  },
  "volta": {
    "node": "14.17.0",
    "npm": "7.19.1"
  }
}
```

### 주요 명령어

자세한 명령어들은 아래 링크 참조
[https://docs.volta.sh/reference/](https://docs.volta.sh/reference/)

- volta install

    - Node.js 또는 Node 패키지 매니저를 volta에 설치 후 현재 context를 변경
    - 이미 해당 버전이 설치되어 있으면 현재 context를 변경
    - ex1) `volta install node@16.17`
    - ex2) `volta install yarn@1.22`

- volta uninstall
    - Node.js 또는 Node 패키지 매니저를 volta에서 제거
    - ex1) `volta uninstall node@16.17`
    - ex2) `volta uninstall yarn@1.22`

- volta list
    - volta에 설치된 노드 또는 패키지매니저 정보를 확인
      - ex) `volta list`: 아래 사진과 같이 현재 활성화된 volta 정보를 보여줌
        ![Untitled](./assets/Untitled-9988248.png)

      - ex) `volta list node`: 아래 사진과 같이 volta에 설치된 Node 정보를 보여줌
        ![Untitled 1](./assets/Untitled 1-9988257.png)
    
- volta pin
    - 현재 package.json에 node 버전을 픽스하는 구문 추가
    - ex) `volta pin node@16.17`

## Intellij에서의 통합
주로 사용하는 툴이 webstorm 이라 vscode는 나중에 업데이트 하겠음.

> 💡 Node interpreter, Package manager 를 변경 시 스크립트 실행을 volta 에 설치된 node 로 하게되고 volta 는 스크립트 실행 전 package.json 에 명시된 node 의 버전을 보고 해당 버전으로 스크립트를 실행해준다.

아래 사진과 같이 intellij 설정에 들어가서
Languages & Framework > Node.js에서 Node interpreter, Package manager 변경

- Node Interpreter: 경로에 .volta 들어가 있는 것으로 변경
    - 없으면 … 버튼 클릭 후 추가
    - `volta which node`를 통해 Volta에 설치된 Node Path 확인 가능
- Package manager: 경로에 .volta 들어가 있는 것으로 변경
    - 없으면 … 버튼 클릭 후 추가
    - `volta which npm (yarn, pnpm 동일)`를 통해 Volta에 설치된 패키지 매니저 Path 확인 가능
      ![Untitled](./assets/Untitled-9988452.png)

## 사용 경험
앞서 말한대로 brew에 nvm 설치하면서 쓰다가 volta를 접한 이후에는 volta로만 노드 버전을 관리하고 있다.  
개인 프로젝트 진행에서야 최신 버전만 가져다 쓰면 되지만, 회사 프로젝트를 진행하다보면 어쩔 수 없이 레거시를 쓸 수 밖에 없는데,  
이 때, volta로 packge.json에 버전을 고정해두면 알아서 volta가 노드 버전을 변경해주기 때문에 신경을 안써도 된다...
### 장점
- 설치 및 사용방법이 매우 간단하여 쉽게 익힐 수 있다. 
- package.json에 버전 고정할 수 있는 기능이 매우 편리하다.
- node 및 각 패키지 관리자(npm, yarn, pnpm)를 volta를 통해 일괄 관리 가능하다.

### 단점
- 명령어가 뭔가 비직관적이다.
- 패키지 매니저에 따라 라이브러리 global 설치가 오류가 발생 (pnpm)
