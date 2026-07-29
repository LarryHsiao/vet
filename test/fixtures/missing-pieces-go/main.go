package main

import (
	"fmt"

	"github.com/google/uuid"

	"missingpiecesfixture/internal/greeting"
	"missingpiecesfixture/internal/missing"
)

func main() {
	fmt.Println(greeting.Hello())
	fmt.Println(missing.Placeholder())
	fmt.Println(uuid.New())
}
