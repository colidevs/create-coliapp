import {Button} from "./components/ui/button"

function App() {

  const projectName = "{{name}}"

  return (
    <>
      <Button onPress={() => alert('Happy Coding!!')}>{projectName} 🚀</Button>
    </>
  )
}

export default App
